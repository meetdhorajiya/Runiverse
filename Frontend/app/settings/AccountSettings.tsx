// import React, { useState } from "react";
// import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";

// export default function AccountSettings() {
//   const [name, setName] = useState("Change Name");
//   const [bio, setBio] = useState("");
//   const [email, setEmail] = useState("example@email.com");

//   return (
//     <ScrollView style={styles.container}>
//       <Text style={styles.header}>👤 Account Settings</Text>

//       <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Change Name" />
//       <TextInput style={styles.input} value={bio} onChangeText={setBio} placeholder="Add Bio" />
//       <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Update Email" />

//       <TouchableOpacity style={styles.button}>
//         <Text style={styles.buttonText}>Change Password</Text>
//       </TouchableOpacity>
//       <TouchableOpacity
//         style={[styles.button, { backgroundColor: "#ff4d4d" }]}
//         onPress={() => Alert.alert("Delete Account", "Are you sure?")}
//       >
//         <Text style={styles.buttonText}>Delete Account</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#121212", padding: 20 },
//   header: { fontSize: 22, fontWeight: "bold", color: "#00e0ff", marginBottom: 20 },
//   input: {
//     borderWidth: 1, borderColor: "#333", borderRadius: 10,
//     padding: 10, marginBottom: 10, color: "#fff", backgroundColor: "#1e1e1e",
//   },
//   button: {
//     backgroundColor: "#00e0ff", padding: 12, borderRadius: 10,
//     marginVertical: 5, alignItems: "center",
//   },
//   buttonText: { color: "#fff", fontWeight: "bold" },
// });

// import React, { useState } from "react";
// import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

// export default function AccountSettings() {
//   // Default values (in real app these would come from backend or Firebase)
//   const [name, setName] = useState("Change Name");
//   const [bio, setBio] = useState("This is my bio...");
//   const [email, setEmail] = useState("user@example.com");
//   const [password, setPassword] = useState("********");

//   return (
//     <ScrollView style={styles.container}>
//       <Text style={styles.header}>👤 Account Settings</Text>

//       {/* Profile Photo */}
//       <View style={styles.photoSection}>
//         <Image source={{ uri: "https://placekitten.com/200/200" }} style={styles.profilePhoto} />
//         <TouchableOpacity style={styles.changePhotoBtn}>
//           <Text style={styles.changePhotoText}>Change Photo</Text>
//         </TouchableOpacity>
//       </View>

//       {/* Name */}
//       <Text style={styles.label}>Name</Text>
//       <TextInput style={styles.input} value={name} onChangeText={setName} />

//       {/* Bio */}
//       <Text style={styles.label}>Bio</Text>
//       <TextInput
//         style={[styles.input, { height: 80 }]}
//         value={bio}
//         onChangeText={setBio}
//         multiline
//       />

//       {/* Email */}
//       <Text style={styles.label}>Email</Text>
//       <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />

//       {/* Password */}
//       <Text style={styles.label}>Password</Text>
//       <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

//       {/* Buttons */}
//       <TouchableOpacity style={styles.button}>
//         <Text style={styles.buttonText}>Update Account</Text>
//       </TouchableOpacity>

//       <TouchableOpacity style={[styles.button, { backgroundColor: "#ff4d4d" }]}>
//         <Text style={styles.buttonText}>Delete Account</Text>
//       </TouchableOpacity>
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: "#121212", padding: 20 },
//   header: { fontSize: 22, fontWeight: "bold", color: "#00e0ff", marginBottom: 20 },
//   label: { color: "#bbb", marginTop: 15 },
//   input: {
//     backgroundColor: "#1e1e1e",
//     color: "#fff",
//     padding: 12,
//     borderRadius: 8,
//     marginTop: 5,
//   },
//   photoSection: { alignItems: "center", marginBottom: 20 },
//   profilePhoto: { width: 100, height: 100, borderRadius: 50, marginBottom: 10 },
//   changePhotoBtn: { padding: 8, backgroundColor: "#00e0ff33", borderRadius: 8 },
//   changePhotoText: { color: "#00e0ff" },
//   button: { marginTop: 20, backgroundColor: "#00e0ff", padding: 12, borderRadius: 10, alignItems: "center" },
//   buttonText: { color: "#fff", fontWeight: "bold" },
// });

import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  Pressable,
  View,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useStore } from "@/store/useStore";
import Toast from "react-native-toast-message";

export default function AccountSettings() {
  const { theme } = useTheme();
  const router = useRouter();
  const user = useStore((s) => s.user);
  const updateUser = useStore((s) => s.updateUser);
  const isDarkMode = theme === "dark";

  const [name, setName] = useState(user?.username || "");
  const [email, setEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const bgClass = isDarkMode ? "bg-background-dark" : "bg-gray-100";
  const textClass = isDarkMode ? "text-text-primary" : "text-gray-900";
  const cardBgClass = isDarkMode ? "bg-card-dark" : "bg-white";
  const inputBg = isDarkMode ? "bg-gray-800" : "bg-gray-100";
  const inputText = isDarkMode ? "text-white" : "text-gray-900";

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateUser({ username: name, email });
      Toast.show({
        type: "success",
        text1: "Account Updated",
        text2: "Your account information has been saved.",
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: "Update Failed",
        text2: error.message || "Could not update account",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Toast.show({
              type: "info",
              text1: "Account Deletion",
              text2: "This feature will be implemented soon.",
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className={`flex-1 ${bgClass}`}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View className="px-6 pt-6">
            <View className="flex-row items-center mb-6">
              <Pressable onPress={() => router.back()} className="mr-4 p-2 -ml-2">
                <Ionicons name="arrow-back" size={28} color={isDarkMode ? "white" : "black"} />
              </Pressable>
              <Text className={`text-3xl font-bold ${textClass} tracking-tight`}>Account Settings</Text>
            </View>

            <Animated.View entering={FadeInDown.duration(600).delay(100)} className={`rounded-3xl p-6 mb-6 shadow-lg ${cardBgClass}`}>
              <View className="flex-row items-center mb-6">
                <View className="bg-primary/10 dark:bg-primary/20 p-3 rounded-2xl mr-3">
                  <Ionicons name="person" size={24} color="#6A5ACD" />
                </View>
                <Text className={`text-xl font-bold ${textClass}`}>Profile Information</Text>
              </View>

              <View className="mb-4">
                <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Username
                </Text>
                <TextInput
                  className={`${inputBg} ${inputText} px-4 py-3 rounded-xl text-base`}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your username"
                  placeholderTextColor={isDarkMode ? "#666" : "#999"}
                />
              </View>

              <View className="mb-4">
                <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Email Address
                </Text>
                <TextInput
                  className={`${inputBg} ${inputText} px-4 py-3 rounded-xl text-base`}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  placeholder="Enter your email"
                  placeholderTextColor={isDarkMode ? "#666" : "#999"}
                  autoCapitalize="none"
                />
              </View>

              <View className="mb-6">
                <Text className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  New Password (optional)
                </Text>
                <TextInput
                  className={`${inputBg} ${inputText} px-4 py-3 rounded-xl text-base`}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  placeholder="Enter new password"
                  placeholderTextColor={isDarkMode ? "#666" : "#999"}
                />
              </View>

              <Pressable
                onPress={handleUpdate}
                disabled={loading}
                className="active:scale-95"
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <LinearGradient
                  colors={['#6A5ACD', '#00C853']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="py-4 rounded-xl items-center"
                >
                  <Text className="text-white font-bold text-base tracking-wide">
                    {loading ? "Updating..." : "Update Account"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(600).delay(200)} className={`rounded-3xl p-6 shadow-lg ${cardBgClass}`}>
              <View className="flex-row items-center mb-4">
                <View className="bg-red-500/10 p-3 rounded-2xl mr-3">
                  <Ionicons name="warning" size={24} color="#EF4444" />
                </View>
                <Text className={`text-xl font-bold ${textClass}`}>Danger Zone</Text>
              </View>
              
              <Text className={`text-sm mb-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Permanently delete your account and all associated data. This action cannot be undone.
              </Text>

              <Pressable
                onPress={handleDeleteAccount}
                className="bg-red-500 py-4 rounded-xl items-center active:scale-95"
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              >
                <Text className="text-white font-bold text-base tracking-wide">Delete Account</Text>
              </Pressable>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

