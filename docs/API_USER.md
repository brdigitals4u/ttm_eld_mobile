# User API Documentation

**File:** `src/api/user.ts`

## Overview

User profile management API module. Handles user profile retrieval, updates, password changes, avatar uploads, and account deletion. Integrates with Realm database for local data persistence.

## Features

- User profile retrieval and updates
- Password change functionality
- Avatar upload support
- Account deletion
- React Query hooks for data management
- Automatic Realm database synchronization

## Data Types

### UpdateProfileData

Profile update payload:

```typescript
{
  firstName?: string
  lastName?: string
  phoneNumber?: string
  dateOfBirth?: Date
}
```

All fields are optional - only included fields will be updated.

### ChangePasswordData

Password change payload:

```typescript
{
  currentPassword: string
  newPassword: string
}
```

## API Functions

### `userApi.getProfile()`

Fetches the current user's profile.

**Returns:** Promise<UserType>

**Side Effects:**
- Updates user data in Realm database

**Example:**
```typescript
const profile = await userApi.getProfile()
console.log(`Name: ${profile.firstName} ${profile.lastName}`)
console.log(`Email: ${profile.email}`)
```

### `userApi.updateProfile(data)`

Updates the user's profile information.

**Parameters:**
- `data`: UpdateProfileData object (partial profile data)

**Returns:** Promise<UserType> - Updated user profile

**Side Effects:**
- Updates user data in Realm database

**Example:**
```typescript
const updatedProfile = await userApi.updateProfile({
  firstName: 'John',
  lastName: 'Doe',
  phoneNumber: '+1234567890'
})
```

### `userApi.changePassword(data)`

Changes the user's password.

**Parameters:**
- `data`: ChangePasswordData object

**Returns:** Promise<void>

**Throws:** ApiError on failure (invalid current password, weak new password, etc.)

**Example:**
```typescript
await userApi.changePassword({
  currentPassword: 'oldPassword123',
  newPassword: 'newSecurePassword456'
})
```

### `userApi.uploadAvatar(file)`

Uploads a new avatar image for the user.

**Parameters:**
- `file`: File object (browser) or image picker result (React Native)

**Returns:** Promise<{ avatar: string }> - Avatar URL

**Side Effects:**
- Updates avatar URL in Realm database

**Note:** In React Native, you may need to convert image picker result to File/FormData format.

**Example (Web):**
```typescript
const fileInput = document.querySelector('input[type="file"]')
const file = fileInput.files[0]

const result = await userApi.uploadAvatar(file)
console.log(`Avatar URL: ${result.avatar}`)
```

**Example (React Native):**
```typescript
import * as ImagePicker from 'expo-image-picker'

const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.8
})

if (!result.canceled) {
  // Convert to FormData
  const formData = new FormData()
  formData.append('avatar', {
    uri: result.assets[0].uri,
    type: 'image/jpeg',
    name: 'avatar.jpg'
  } as any)
  
  const uploadResult = await userApi.uploadAvatar(formData)
}
```

### `userApi.deleteAccount(password)`

Deletes the user's account permanently.

**Parameters:**
- `password`: string - User's password for confirmation

**Returns:** Promise<void>

**Side Effects:**
- Clears all local data from Realm
- Clears all storage

**Warning:** This action is irreversible!

**Example:**
```typescript
await userApi.deleteAccount('userPassword123')
```

## React Query Hooks

### `useUserProfile()`

Query hook to fetch user profile.

**Returns:** UseQueryResult<UserType>

**Configuration:**
- Stale time: 5 minutes
- Doesn't retry on 401 errors
- Retries up to 3 times on other errors

**Example:**
```typescript
const { data: profile, isLoading, error, refetch } = useUserProfile()

if (isLoading) return <Loading />
if (error) return <Error message={error.message} />

return (
  <View>
    <Text>{profile.firstName} {profile.lastName}</Text>
    <Text>{profile.email}</Text>
  </View>
)
```

### `useUpdateProfile()`

Mutation hook for updating user profile.

**Returns:** UseMutationResult

**Side Effects:**
- Updates React Query cache with new data on success

**Example:**
```typescript
const updateMutation = useUpdateProfile()

const handleUpdate = () => {
  updateMutation.mutate({
    firstName: 'Jane',
    phoneNumber: '+1234567890'
  }, {
    onSuccess: (data) => {
      Toast.show({ text1: 'Profile updated successfully' })
    },
    onError: (error) => {
      Toast.show({ text1: 'Update failed', text2: error.message })
    }
  })
}
```

### `useChangePassword()`

Mutation hook for changing password.

**Returns:** UseMutationResult

**Example:**
```typescript
const changePasswordMutation = useChangePassword()

const handleChangePassword = () => {
  changePasswordMutation.mutate({
    currentPassword: currentPassword,
    newPassword: newPassword
  }, {
    onSuccess: () => {
      Toast.show({ text1: 'Password changed successfully' })
    },
    onError: (error) => {
      Toast.show({ text1: 'Password change failed', text2: error.message })
    }
  })
}
```

### `useUploadAvatar()`

Mutation hook for uploading avatar.

**Returns:** UseMutationResult

**Side Effects:**
- Updates avatar in React Query cache on success

**Example:**
```typescript
const uploadAvatarMutation = useUploadAvatar()

const handleAvatarUpload = async (imageUri: string) => {
  const formData = new FormData()
  formData.append('avatar', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'avatar.jpg'
  } as any)
  
  uploadAvatarMutation.mutate(formData, {
    onSuccess: (data) => {
      Toast.show({ text1: 'Avatar updated successfully' })
    }
  })
}
```

### `useDeleteAccount()`

Mutation hook for account deletion.

**Returns:** UseMutationResult

**Side Effects:**
- Clears all React Query cache on success

**Example:**
```typescript
const deleteAccountMutation = useDeleteAccount()

const handleDeleteAccount = () => {
  Alert.alert(
    'Delete Account',
    'This action cannot be undone. Are you sure?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteAccountMutation.mutate(password, {
            onSuccess: () => {
              // Navigate to login
            }
          })
        }
      }
    ]
  )
}
```

## Data Flow

1. **Get Profile**: API → User Data → Realm Update → React Query Cache
2. **Update Profile**: Form Data → API → Updated Data → Realm Update → Cache Update
3. **Change Password**: Password Data → API → Success/Error
4. **Upload Avatar**: File → FormData → API → Avatar URL → Realm Update → Cache Update
5. **Delete Account**: Password → API → Clear Storage → Clear Realm → Clear Cache

## Error Handling

- All functions throw `ApiError` on failure
- React Query hooks handle errors and log them
- UI should display user-friendly error messages
- Password errors may include validation messages

## Validation

**Profile Updates:**
- Phone number should be valid format
- Date of birth should be valid date
- Names should not be empty strings

**Password Changes:**
- Current password must be correct
- New password must meet requirements (length, complexity)
- Passwords should not match

**Avatar Upload:**
- File size limit (typically 5MB)
- Supported formats (JPEG, PNG, WebP)
- Image dimensions may be restricted

## Dependencies

- `@tanstack/react-query`: React Query hooks
- `./client`: ApiClient and ApiError
- `./constants`: API endpoints and query keys
- `@/database/realm`: Realm database service
- `@/database/schemas`: UserType definition
- `@/utils/storage`: Storage utilities

## Security Considerations

1. **Password Changes**: Always require current password
2. **Account Deletion**: Require password confirmation
3. **Avatar Upload**: Validate file type and size on client and server
4. **Profile Updates**: Validate data format and sanitize inputs
5. **Token Management**: Avatar upload requires valid authentication token

