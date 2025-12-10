# Google Play Data Safety Section Content

## What Data is Collected

### Location Data
- **Precise location**: GPS coordinates (latitude and longitude)
- **Approximate location**: Used for motion detection and vehicle movement tracking
- **Collection frequency**: Continuous tracking while driving, including when the app is closed or in the background

### Device Information
- **Device ID**: Unique device identifier for app functionality
- **Vehicle information**: VIN (Vehicle Identification Number), vehicle assignment data

### Other Data
- **Driver information**: Driver ID, duty status, Hours of Service (HOS) logs
- **Trip data**: Shipping numbers, trip start/end locations, distance traveled

## Why Data is Collected

### FMCSA Regulatory Compliance
- **Primary purpose**: Compliance with Federal Motor Carrier Safety Administration (FMCSA) regulations (49 CFR §395)
- **Electronic Logging Device (ELD) functionality**: Required by law for commercial motor vehicle operators
- **Hours of Service (HOS) compliance**: Accurate tracking of driver duty status and driving time
- **Vehicle movement detection**: Automatic detection of vehicle movement for accurate log generation
- **Duty status tracking**: Recording driver duty status changes (driving, on-duty not driving, off-duty, sleeper berth)

## How Data is Used

### ELD Compliance Functions
- **Generate FMCSA-required electronic logs**: Automatic creation of electronic logs as required by federal regulations
- **Record driver duty status changes**: Timestamp and location of all duty status changes
- **Detect vehicle movement and driving time**: Automatic detection of when vehicle is moving vs. stationary
- **Synchronize with ELD hardware devices**: Integration with engine-connected ELD devices for accurate data collection
- **Ensure compliance with federal regulations**: Verification that driver and vehicle operations comply with FMCSA rules
- **Provide accurate HOS calculations**: Calculation of available driving time, on-duty time, and required rest periods

### App Functionality
- **Trip management**: Tracking active trips, shipping numbers, and trip locations
- **Vehicle assignment**: Managing vehicle assignments and vehicle information
- **Driver identification**: Identifying and authenticating drivers

## Data Sharing

### Shared with Regulatory Authorities
- **FMCSA auditors**: Location and HOS data may be shared with FMCSA auditors during compliance audits, as required by law
- **Law enforcement**: Data may be shared with law enforcement agencies when required by law or court order

### Not Shared
- **Third-party advertising**: Location data is NOT shared with third parties for advertising or marketing purposes
- **Data brokers**: Location data is NOT sold or shared with data brokers
- **Analytics companies**: Location data is NOT shared with analytics companies for non-compliance purposes

### Fleet Management Systems
- **Fleet operators**: Location and HOS data may be shared with authorized fleet management systems for fleet operations and compliance management

## Data Retention

### Minimum Retention Period
- **6 months**: Location and HOS data is retained for a minimum of 6 months as required by FMCSA regulations (49 CFR §395.8)

### Extended Retention
- **Compliance purposes**: Data may be retained longer than 6 months for compliance verification and audit purposes
- **Legal requirements**: Data may be retained longer if required by law or court order
- **Fleet management**: Data may be retained longer for fleet management and operational purposes

## Security Measures

### Data Encryption
- **In transit**: All data transmitted between the app and servers is encrypted using HTTPS/TLS (Transport Layer Security)
- **At rest**: Data stored on servers is encrypted at rest using industry-standard encryption methods

### Access Controls
- **Authentication required**: Secure authentication is required to access the app and user data
- **Authorized personnel only**: Access to location and HOS data is limited to authorized personnel only
- **Role-based access**: Different user roles have different levels of access to data

### Security Practices
- **Regular security audits**: Regular security audits and vulnerability assessments are performed
- **Secure servers**: Data is stored on secure servers with appropriate physical and logical security measures
- **Secure APIs**: All API endpoints use secure authentication and authorization mechanisms

## User Rights

### Access and Deletion
- **Access your data**: Users can access their location and HOS data through the app
- **Request deletion**: Users can request deletion of their data, subject to legal retention requirements
- **Data export**: Users can export their HOS logs and trip data

### Control
- **Location permission**: Users can grant or deny location permissions (though denial may limit app functionality)
- **Account deletion**: Users can delete their account, subject to legal retention requirements

## Compliance

### FMCSA Regulations
- This app complies with FMCSA regulations (49 CFR §395) for Electronic Logging Devices (ELD)
- Location data collection is required by law for ELD compliance
- Data retention and sharing practices comply with FMCSA requirements

### Google Play Policies
- This app complies with Google Play Store policies for location data collection and use
- Prominent disclosure is shown before requesting location permissions
- Users have control over location permissions

