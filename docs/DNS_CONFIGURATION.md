# DNS Configuration for ttmkonnect.com

## Overview

This script configures DNS records in AWS Route53 for proper email delivery:
- Sets Google Workspace MX records
- Updates SPF to include Google Workspace, AWS SES, and VPS IP
- Configures DMARC for email monitoring
- Sets mail A record for VPS
- Removes old noreply MX record if present

## Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **Route53 hosted zone** for `ttmkonnect.com`
3. **jq installed** (for JSON parsing)
4. **dig installed** (optional, for verification)

## Script Location

`scripts/fix-ttmkonnect-dns.sh`

## What the Script Does

### 1. MX Records (Root Domain)
Sets Google Workspace MX records:
- `1 ASPMX.L.GOOGLE.COM.`
- `5 ALT1.ASPMX.L.GOOGLE.COM.`
- `5 ALT2.ASPMX.L.GOOGLE.COM.`
- `10 ALT3.ASPMX.L.GOOGLE.COM.`
- `10 ALT4.ASPMX.L.GOOGLE.COM.`

### 2. SPF TXT Record
Updates SPF to include:
- Google Workspace (`include:_spf.google.com`)
- AWS SES (`include:amazonses.com`)
- VPS IP (`ip4:72.61.146.145`)
- Policy: `-all` (reject all others)

### 3. DMARC Record
Sets DMARC policy:
- `v=DMARC1; p=none; rua=mailto:admin@ttmkonnect.com`
- `p=none` means monitoring only (no enforcement)

### 4. Mail A Record
Sets `mail.ttmkonnect.com` A record to VPS IP: `72.61.146.145`

### 5. Cleanup
Attempts to delete `noreply.ttmkonnect.com` MX record if it exists

## Running the Script

```bash
# Make executable (already done)
chmod +x scripts/fix-ttmkonnect-dns.sh

# Run the script
./scripts/fix-ttmkonnect-dns.sh
```

## Verification Steps

### 1. Monitor Route53 Change

After running, the script will output a Change ID. Monitor it:

```bash
aws route53 get-change --id <change-id>
```

Wait until status is `INSYNC`.

### 2. Verify DNS Records

```bash
# Check MX records
dig +short MX ttmkonnect.com

# Check SPF TXT record
dig +short TXT ttmkonnect.com

# Check mail A record
dig +short A mail.ttmkonnect.com

# Check DMARC
dig +short TXT _dmarc.ttmkonnect.com

# Check reverse DNS (after setting PTR at Hostinger)
dig +short -x 72.61.146.145
```

### 3. Test Email Delivery

1. **Send test email** to `support@ttmkonnect.com` from external account
   - Should be accepted by Google Workspace

2. **Send test from SES** (noreply@ttmkonnect.com)
   - Check mail headers for SPF/DKIM pass

## Important Next Steps

### 1. Set PTR (Reverse DNS) at Hostinger

1. Login to Hostinger hPanel
2. Navigate to: VPS → Select VPS → Settings → IP Address
3. Set PTR record to: `mail.ttmkonnect.com`

### 2. Configure VPS SMTP Hostname

Ensure your VPS SMTP server (e.g., Postfix) has hostname set to `mail.ttmkonnect.com`:

```bash
# For Postfix
sudo postconf -e "myhostname = mail.ttmkonnect.com"
sudo systemctl restart postfix
```

## Expected Results

After DNS propagation (TTL ~300 seconds):

- ✅ Root MX points to Google Workspace
- ✅ SPF includes Google, SES, and VPS IP
- ✅ DMARC is configured for monitoring
- ✅ mail.ttmkonnect.com resolves to VPS IP
- ✅ PTR record points to mail.ttmkonnect.com
- ✅ Email delivery works correctly

## Troubleshooting

### Issue: Script can't find hosted zone

**Solution**: Verify AWS CLI has Route53 permissions and domain is in Route53

### Issue: DNS changes not propagating

**Solution**: 
- Wait for TTL (300 seconds)
- Check Route53 change status
- Verify DNS cache is cleared

### Issue: Email still not working

**Solution**:
- Verify PTR record is set at Hostinger
- Check VPS SMTP configuration
- Verify SPF/DKIM in email headers
- Check Google Workspace MX records are correct

## Security Notes

- SPF policy is set to `-all` (strict - reject all others)
- DMARC is set to `p=none` (monitoring only - adjust later if needed)
- Ensure VPS IP is correct before running script

## References

- [Google Workspace MX Records](https://support.google.com/a/answer/174125)
- [AWS SES SPF Configuration](https://docs.aws.amazon.com/ses/latest/dg/send-email-authentication-spf.html)
- [DMARC Policy Guide](https://dmarc.org/wiki/FAQ)
















