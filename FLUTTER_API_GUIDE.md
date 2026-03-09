# Property Rent – Flutter App se Backend Connect kaise karein

Backend **http://localhost:5000** (ya jo bhi aapka server URL hai) pe chal raha ho. Flutter app ko isi base URL se connect karna hai.

---

## 1. Flutter project mein dependencies

`pubspec.yaml` mein add karein:

```yaml
dependencies:
  http: ^1.1.0
  # ya
  dio: ^5.4.0
  shared_preferences: ^2.2.2
  image_picker: ^1.0.4
```

- **http** ya **dio** – API calls
- **shared_preferences** – token save/load
- **image_picker** – signup ke liye profile image

---

## 2. Base URL (Environment)

- **Emulator / same PC:** `http://10.0.2.2:5000` (Android) ya `http://localhost:5000` (iOS sim)
- **Real device (same WiFi):** PC ka local IP use karein, e.g. `http://192.168.1.5:5000`
- **Deployed backend:** `https://your-api.com`

Example:

```dart
class ApiConfig {
  static const String baseUrl = 'http://10.0.2.2:5000'; // Android emulator
  // static const String baseUrl = 'http://192.168.1.5:5000'; // real device
}
```

---

## 3. API service (sari auth APIs)

Neeche sab endpoints ek hi place se call kar sakte ho. Token ko `shared_preferences` mein save karke profile aur baaki protected calls mein use karein.

### 3.1 Signup (OTP bhejta hai)

- **URL:** `POST /api/auth/signup`
- **Body:** `multipart/form-data`
  - `username`, `email`, `contact`, `password`, `confirm_password` (text)
  - `profile_image` (file – `image_picker` se file path)

```dart
// dio example
Future<Map<String, dynamic>> signup({
  required String username,
  required String email,
  required String contact,
  required String password,
  required String confirmPassword,
  required File profileImage,
}) async {
  var formData = FormData.fromMap({
    'username': username,
    'email': email,
    'contact': contact,
    'password': password,
    'confirm_password': confirmPassword,
    'profile_image': await MultipartFile.fromFile(profileImage.path),
  });
  var res = await dio.post('$baseUrl/api/auth/signup', data: formData);
  return res.data as Map<String, dynamic>;
}
```

Response: `{ "message": "OTP sent to email" }`  
Agar error (e.g. email exists): `{ "message": "..." }` + status 400.

---

### 3.2 Verify OTP (signup complete + token)

- **URL:** `POST /api/auth/verify-otp`
- **Body (JSON):** `{ "email": "...", "otp": "123456" }`

```dart
Future<Map<String, dynamic>> verifyOtp(String email, String otp) async {
  var res = await dio.post(
    '$baseUrl/api/auth/verify-otp',
    data: {'email': email, 'otp': otp},
  );
  return res.data; // { "message": "Signup successful", "token": "..." }
}
```

Token ko save karein (e.g. `shared_preferences`) aur login ke baad jaisa use karein.

---

### 3.3 Login

- **URL:** `POST /api/auth/login`
- **Body (JSON):** `{ "email": "...", "password": "..." }`

```dart
Future<Map<String, dynamic>> login(String email, String password) async {
  var res = await dio.post(
    '$baseUrl/api/auth/login',
    data: {'email': email, 'password': password},
  );
  return res.data; // { "message": "Login successful", "token": "..." }
}
```

Token save karke profile / home pe use karein.

---

### 3.4 Forgot Password

- **URL:** `POST /api/auth/forgot-password`
- **Body (JSON):** `{ "email": "..." }`

```dart
Future<Map<String, dynamic>> forgotPassword(String email) async {
  var res = await dio.post(
    '$baseUrl/api/auth/forgot-password',
    data: {'email': email},
  );
  return res.data; // { "message": "Reset code sent to your email. Valid for 15 minutes." }
}
```

User ko email pe 6-digit code aata hai.

---

### 3.5 Reset Password

- **URL:** `POST /api/auth/reset-password`
- **Body (JSON):**  
  `{ "email": "...", "code": "123456", "new_password": "...", "confirm_password": "..." }`

```dart
Future<Map<String, dynamic>> resetPassword({
  required String email,
  required String code,
  required String newPassword,
  required String confirmPassword,
}) async {
  var res = await dio.post(
    '$baseUrl/api/auth/reset-password',
    data: {
      'email': email,
      'code': code,
      'new_password': newPassword,
      'confirm_password': confirmPassword,
    },
  );
  return res.data; // { "message": "Password reset successful. You can login now." }
}
```

Uske baad naye password se login karein.

---

### 3.6 Get Profile (token required)

- **URL:** `GET /api/auth/profile`
- **Header:** `Authorization: Bearer <token>`

```dart
Future<Map<String, dynamic>> getProfile() async {
  String? token = await getStoredToken(); // shared_preferences
  var res = await dio.get(
    '$baseUrl/api/auth/profile',
    options: Options(headers: {'Authorization': 'Bearer $token'}),
  );
  return res.data; // { id, username, email, contact, profile_image, ... }
}
```

---

## 4. Token save / load (shared_preferences)

```dart
import 'package:shared_preferences/shared_preferences.dart';

Future<void> saveToken(String token) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString('auth_token', token);
}

Future<String?> getStoredToken() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString('auth_token');
}

Future<void> clearToken() async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.remove('auth_token');
}
```

Login / Verify OTP ke baad `saveToken(data['token'])` call karein. Logout pe `clearToken()`.

---

## 5. Dio interceptor (optional – auto token)

Har request pe token lagane ke liye:

```dart
dio.interceptors.add(InterceptorsWrapper(
  onRequest: (options, handler) async {
    String? token = await getStoredToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    return handler.next(options);
  },
  onError: (err, handler) async {
    if (err.response?.statusCode == 401) {
      await clearToken();
      // navigate to login
    }
    return handler.next(err);
  },
));
```

---

## 6. Sari functionality flow (summary)

| Screen / Action      | API                      | Body / Headers |
|----------------------|--------------------------|----------------|
| Signup               | POST /api/auth/signup    | form-data: username, email, contact, password, confirm_password, profile_image |
| OTP verify           | POST /api/auth/verify-otp| JSON: email, otp → save token |
| Login                | POST /api/auth/login     | JSON: email, password → save token |
| Forgot password      | POST /api/auth/forgot-password | JSON: email |
| Reset password       | POST /api/auth/reset-password   | JSON: email, code, new_password, confirm_password |
| Profile (after login)| GET /api/auth/profile    | Header: Authorization: Bearer &lt;token&gt; |

---

## 7. Error handling

Backend 400/401/500 pe `{ "message": "..." }` bhejta hai. Flutter mein:

```dart
try {
  var data = await login(email, password);
  await saveToken(data['token']);
  // go to home
} on DioException catch (e) {
  String msg = e.response?.data?['message'] ?? 'Something went wrong';
  // show SnackBar / dialog: msg
}
```

---

## 8. CORS (browser / web)

Agar Flutter **web** se same backend call kar rahe ho to backend pe CORS already hai (`cors` package). Mobile/desktop pe CORS issue nahi aata.

---

Yeh guide use karke aap Flutter app ko isi backend se connect karke signup, OTP verify, login, forgot/reset password aur profile ki sari functionality implement kar sakte ho. Koi specific screen (e.g. forgot password UI) chahiye to batao, us hisaab se code structure bata sakta hoon.
