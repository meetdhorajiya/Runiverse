import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Link } from 'expo-router';
import CustomInput from '../components/CustomInput';
import { User as UserModel } from '../lib/models/User';
import { authService } from '../services/AuthService';
import { profileService } from '../services/profileService';
import { useStore } from '@/store/useStore';

export default function RegisterScreen() {
  const router = useRouter();
  const setUser = useStore(s => s.setUser);
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
      const newUser = new UserModel(lastName, username, email, mobile);
      (newUser as any).password = password; // backend expects plain password here (hashed server-side)
      const result = await authService.register(newUser as any);
      if (!result.success || !result.user) {
        Alert.alert('Registration Failed', result.message);
        return;
      }

      const baseUser = {
        id: result.user.id,
        username: result.user.username,
        avatarUrl: result.user.avatar || 'https://i.pravatar.cc/150?u=' + result.user.id,
        email: result.user.email,
        steps: result.user.steps,
        distance: result.user.distance,
        territories: result.user.territories,
      } as any;

      // Enrich with /me endpoint (in case backend adds more fields later)
      try {
        const prof = await profileService.fetchMe();
        if (prof.success && prof.data) {
          setUser({ ...baseUser, ...prof.data } as any);
        } else {
          setUser(baseUser);
        }
      } catch {
        setUser(baseUser);
      }

      Alert.alert('Success', result.message, [{ text: 'Continue', onPress: () => router.replace('/(tabs)') }]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Unexpected error');
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
      <CustomInput iconName="account-outline" placeholder="Enter Your Last Name" value={lastName} onChangeText={setLastName} />
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