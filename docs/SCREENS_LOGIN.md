# Login Screen Documentation

**File:** `src/screens/LoginScreen.tsx`

## Overview

Authentication screen for driver login using organization credentials. Includes email/password input, privacy policy agreement, form validation, and animated login button.

## Key Features

- **Email/Password Login**: Standard credential input
- **Form Validation**: Real-time validation with error messages
- **Privacy Policy Agreement**: Required checkbox before login
- **Animated Login Button**: Loading and success animations
- **Forgot Password**: Link to password recovery (shows toast)
- **Error Handling**: Comprehensive error messages for various failure scenarios

## State Management

### Local State

```typescript
const [credentials, setCredentials] = useState<LoginCredentials>({
  email: 'testdriver.cognito@ttmkonnect.com',
  password: 'TestDriver@2025!',
})
const [errors, setErrors] = useState({ email: '', password: '' })
const [showPassword, setShowPassword] = useState(false)
const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)
const [privacyError, setPrivacyError] = useState('')
```

### Default Credentials

Pre-filled test credentials for development convenience.

## Form Validation

### Email Validation

```typescript
if (!credentials.email) {
  errors.email = 'Email is required'
} else if (!/\S+@\S+\.\S+/.test(credentials.email)) {
  errors.email = 'Email is invalid'
}
```

### Password Validation

```typescript
if (!credentials.password) {
  errors.password = 'Password is required'
} else if (credentials.password.length < 6) {
  errors.password = 'Password must be at least 6 characters'
}
```

### Privacy Agreement Validation

Button is disabled if privacy policy is not agreed to.

## Login Flow

### `handleLogin()` Function

1. **Validates form** using `validateForm()`
2. **Checks privacy agreement**
3. **Calls driver login mutation** via `useDriverLogin()` hook
4. **Updates auth store** with login result
5. **Shows success toast**
6. **Handles errors** with specific messages

### Error Handling

```typescript
// 401: Invalid credentials
// 403: Account access denied
// 429: Too many login attempts
// Other: Server error or network error
```

Errors are displayed via toast notification with appropriate duration.

## Privacy Policy

### Checkbox Component

Custom checkbox implementation:
- Pressable container
- Visual checkmark when selected
- Integrated with privacy policy link
- Opens privacy policy URL in browser

### Privacy Policy Link

```typescript
<Text 
  onPress={() => Linking.openURL('https://ttmkonnect.com/privacy')}
>
  Privacy Policy
</Text>
```

Opens in external browser.

## Animated Button

Uses `AnimatedButton` component with:
- **Loading Animation**: Lottie animation during login
- **Success Animation**: Lottie animation on success
- **Disabled State**: When form is invalid or privacy not agreed
- **Success Callback**: Navigates to device scan screen

```typescript
<AnimatedButton
  title={driverLoginMutation.isPending ? 'Logging in…' : 'Login now'}
  onPress={handleLogin}
  onSuccess={handleLoginSuccess}
  loadingAnimation={loadingAnimation}
  successAnimation={successAnimation}
  disabled={isButtonDisabled}
/>
```

## Navigation

### Success Flow

```typescript
const handleLoginSuccess = () => {
  router.replace('/device-scan')
}
```

After successful login, navigates to ELD device scan screen.

### Forgot Password

Shows toast message (placeholder for future implementation):
```typescript
toast.info('Contact support to reset your password!', 2000)
```

## UI Components

### Header Section

- Trident logo image
- Welcome title: "Welcome to TTM Family"
- Subtitle: "Sign in to continue your journey"

### Form Fields

- **Email Input**: 
  - Email keyboard type
  - Auto-capitalize disabled
  - Real-time error clearing
  - Error border styling

- **Password Input**:
  - Secure text entry (toggleable)
  - Real-time error clearing
  - Error border styling

### Privacy Agreement

- Checkbox with custom styling
- Privacy policy text with clickable link
- Error message display

### Action Buttons

- **Login Button**: Animated button with loading/success states
- **Forgot Password Link**: Text link at bottom of form

## Keyboard Handling

Uses `KeyboardAvoidingView` with platform-specific behavior:
- iOS: `padding`
- Android: `height`

ScrollView with `keyboardShouldPersistTaps="handled"` for proper keyboard interaction.

## Styling

### Color Scheme

Uses `COLORS` constants:
- Indigo primary color
- White background
- Gray borders and text
- Red error states

### Input Styling

- Rounded corners (16px)
- Gray background
- Border styling
- Error state with red border
- 60px height for touch targets

### Button Styling

- Indigo background
- Rounded corners (16px)
- Shadow effects
- White text
- 60px height

## Animations

Uses Lottie animations from assets:
- `assets/animations/loading.json`
- `assets/animations/success.json`

## Dependencies

- `@tanstack/react-query` - Login mutation hook
- `@/stores/authStore` - Authentication state
- `@/providers/ToastProvider` - Toast notifications
- `@/components/AnimatedButton` - Animated button
- `@/components/Text` - Custom text component
- `expo-router` - Navigation

## Security Notes

1. **Default Credentials**: Pre-filled for development only
2. **Password Visibility**: Can be toggled (for debugging)
3. **Privacy Agreement**: Required before login (compliance)
4. **Error Messages**: Don't reveal if email exists (security best practice)

## Accessibility

- Proper labels for form fields
- Error messages clearly displayed
- Keyboard navigation support
- Touch target sizes meet accessibility guidelines (60px height)

## Future Enhancements

- Remember me functionality
- Biometric authentication
- Social login options
- Password strength indicator
- Account registration flow

