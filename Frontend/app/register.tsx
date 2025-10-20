import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import CustomInput from '../components/CustomInput';
import { authService } from '../services/AuthService';

export default function RegisterScreen() {
  const router = useRouter();
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password) {
      Alert.alert('Validation', 'Username, email & password are required');
      return;
    }
    try {
      setLoading(true);
      const payload = {
        username,
        email,
        password,
        lastName,
        mobileNumber: mobile,
      } as any;

      const result = await authService.register(payload);

      if (result.success) {
        Alert.alert('✅ Registered', result.message || 'Account created successfully', [
          { text: 'Continue', onPress: () => router.replace('/login') },
        ]);
      } else {
        Alert.alert('❌ Error', result.message || 'Registration failed');
      }
    } catch (e: any) {
      Alert.alert('❌ Error', e?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-dark p-6">
      <Text className="text-text-primary text-3xl font-bold mt-10">
        Create Your{'\n'}New Account
      </Text>

      {/* Profile Picture */}
      <View className="items-center my-8">
        <TouchableOpacity>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61' }}
            className="h-24 w-24 rounded-full"
          />
        </TouchableOpacity>
      </View>

      {/* Form */}
      <CustomInput iconName="account-outline" placeholder="Enter Your Name" value={lastName} onChangeText={setLastName} />
      <CustomInput iconName="account-circle-outline" placeholder="Enter Username" value={username} onChangeText={setUsername} />
      <CustomInput iconName="email-outline" placeholder="Enter Email Id" value={email} onChangeText={setEmail} />
      <CustomInput iconName="phone-outline" placeholder="Mobile Number" value={mobile} onChangeText={setMobile} />
      <CustomInput iconName="lock-outline" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />

      <TouchableOpacity onPress={handleRegister} disabled={loading} className="bg-primary-green rounded-xl p-4 mt-8 items-center">
        {loading ? <ActivityIndicator color="#000" /> : <Text className="text-background-dark font-bold text-lg">NEXT</Text>}
      </TouchableOpacity>
      <View className="flex-row justify-center mt-4">
        <Text className="text-text-secondary">Already have an account? </Text>
        <Link href="/login"><Text className="text-primary-green font-bold">Login</Text></Link>
      </View>
    </SafeAreaView>
  );
}