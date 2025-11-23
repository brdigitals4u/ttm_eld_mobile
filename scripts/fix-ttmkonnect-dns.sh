#!/usr/bin/env bash

set -euo pipefail

# --------- CONFIG ----------
DOMAIN="ttmkonnect.com"
VPS_IP="72.61.146.145"               # your VPS IP from records you showed
# If you want to keep mailer.ttmkonnect.com A, set MAILER_KEEP=true; otherwise it's harmless to keep it
MAIL_HOST="mail.${DOMAIN}"
HOSTED_ZONE_ID=""

# TTL values
TTL_FAST=300

echo "1) Finding Hosted Zone ID for ${DOMAIN}..."

HOSTED_ZONE_ID=$(aws route53 list-hosted-zones-by-name --dns-name "${DOMAIN}" --query "HostedZones[0].Id" --output text)
# the returned ID might be like /hostedzone/Z12345 — strip prefix if necessary
HOSTED_ZONE_ID=${HOSTED_ZONE_ID##*/}

if [[ -z "$HOSTED_ZONE_ID" || "$HOSTED_ZONE_ID" == "None" ]]; then
  echo "ERROR: Could not find hosted zone for ${DOMAIN}. Make sure the domain is in Route53 and your AWS CLI has permissions."
  exit 1
fi
echo "Hosted Zone ID: ${HOSTED_ZONE_ID}"

# --------- Build change-batch JSON ----------

CHANGE_BATCH_FILE="$(mktemp /tmp/rrs-change-$(date +%s)-XXXX.json)"

cat > "${CHANGE_BATCH_FILE}" <<EOF
{
  "Comment": "Update MX to Google Workspace, update SPF to include Google+SES+VPS, set DMARC and mail A record",
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${DOMAIN}.",
        "Type": "MX",
        "TTL": ${TTL_FAST},
        "ResourceRecords": [
          {"Value": "1 ASPMX.L.GOOGLE.COM."},
          {"Value": "5 ALT1.ASPMX.L.GOOGLE.COM."},
          {"Value": "5 ALT2.ASPMX.L.GOOGLE.COM."},
          {"Value": "10 ALT3.ASPMX.L.GOOGLE.COM."},
          {"Value": "10 ALT4.ASPMX.L.GOOGLE.COM."}
        ]
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${DOMAIN}.",
        "Type": "TXT",
        "TTL": ${TTL_FAST},
        "ResourceRecords": [
          {"Value": "\"v=spf1 include:_spf.google.com include:amazonses.com ip4:${VPS_IP} -all\""}
        ]
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "_dmarc.${DOMAIN}.",
        "Type": "TXT",
        "TTL": ${TTL_FAST},
        "ResourceRecords": [
          {"Value": "\"v=DMARC1; p=none; rua=mailto:admin@${DOMAIN}\""}
        ]
      }
    },
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "${MAIL_HOST}.",
        "Type": "A",
        "TTL": ${TTL_FAST},
        "ResourceRecords": [
          {"Value": "${VPS_IP}"}
        ]
      }
    }
  ]
}
EOF

echo "2) Created Route53 change-batch file: ${CHANGE_BATCH_FILE}"
cat "${CHANGE_BATCH_FILE}"

# --------- Perform the UPSERTs ----------

echo "3) Submitting change-batch to Route53..."

CHANGE_RESULT=$(aws route53 change-resource-record-sets --hosted-zone-id "${HOSTED_ZONE_ID}" --change-batch "file://${CHANGE_BATCH_FILE}")
echo "Change submitted. Result:"
echo "${CHANGE_RESULT}"
CHANGE_ID=$(echo "${CHANGE_RESULT}" | jq -r '.ChangeInfo.Id' || true)
if [[ -n "${CHANGE_ID}" ]]; then
  CHG="${CHANGE_ID##*/}"
  echo "Change ID: ${CHG}"
  echo "You can monitor propagation with: aws route53 get-change --id ${CHG}"
fi

# --------- Attempt to delete noreply MX if it exists (exact match) ----------

echo "4) Checking for noreply.${DOMAIN} MX record to remove (if present)..."

NR_EXISTS=$(aws route53 list-resource-record-sets --hosted-zone-id "${HOSTED_ZONE_ID}" --query "ResourceRecordSets[?Name=='noreply.${DOMAIN}.'] | [?Type=='MX']" --output json)

if [[ "${NR_EXISTS}" != "[]" && -n "${NR_EXISTS}" ]]; then
  echo "Found noreply MX record(s):"
  echo "${NR_EXISTS}"
  # Build delete batch for current records (Route53 delete requires exact record set)
  DELETE_FILE="$(mktemp /tmp/rrs-delete-$(date +%s)-XXXX.json)"
  # Extract values and create JSON array using jq to build proper JSON
  MX_RECORDS=$(echo "${NR_EXISTS}" | jq -r '.[0].ResourceRecords' || true)
  if [[ -n "${MX_RECORDS}" && "${MX_RECORDS}" != "null" ]]; then
    # Build the delete JSON using jq to ensure proper formatting
    echo "${NR_EXISTS}" | jq -r --arg domain "noreply.${DOMAIN}." --arg ttl "${TTL_FAST}" '{
      "Comment": "Delete noreply MX (cleanup) if present",
      "Changes": [
        {
          "Action": "DELETE",
          "ResourceRecordSet": {
            "Name": $domain,
            "Type": "MX",
            "TTL": ($ttl | tonumber),
            "ResourceRecords": .[0].ResourceRecords
          }
        }
      ]
    }' > "${DELETE_FILE}"
    
    echo "Submitting deletion batch for noreply MX..."
    echo "Delete batch JSON:"
    cat "${DELETE_FILE}"
    aws route53 change-resource-record-sets --hosted-zone-id "${HOSTED_ZONE_ID}" --change-batch "file://${DELETE_FILE}"
    echo "Delete request submitted (if it matched exactly)."
  else
    echo "No ResourceRecords values found in noreply record; skipping delete."
  fi
else
  echo "No noreply MX record found — nothing to delete."
fi

# --------- Final checks: dig via system if available ----------

echo "5) Quick verification (dig) if dig is installed on this machine..."

if command -v dig >/dev/null 2>&1; then
  echo "MX records for ${DOMAIN}:"
  dig +short MX "${DOMAIN}"
  echo "TXT records for ${DOMAIN}:"
  dig +short TXT "${DOMAIN}"
  echo "A record for ${MAIL_HOST}:"
  dig +short A "${MAIL_HOST}"
  echo "Reverse DNS (PTR) check for ${VPS_IP}:"
  dig +short -x "${VPS_IP}"
else
  echo "dig not installed — please run these checks from a machine that has dig, or use online DNS tools."
fi

echo "DONE. Wait TTL (~${TTL_FAST}s) for DNS propagation; use 'aws route53 get-change --id <change-id>' to monitor."
echo
echo "IMPORTANT NEXT STEP: Set PTR (reverse DNS) at Hostinger hPanel:"
echo " - Login to Hostinger hPanel → VPS → select VPS → Settings → IP Address → Set PTR record → set to: ${MAIL_HOST}"
echo
echo "Also ensure your VPS SMTP greeting/hostname is set to ${MAIL_HOST} (e.g. Postfix myhostname)."

