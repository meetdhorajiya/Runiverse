import React, { useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import CustomInput from '@/components/CustomInput';
import { useStore } from '@/store/useStore';
import { Link, useRouter } from 'expo-router';
import { profileService } from '@/services/profileService';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

const EditProfileScreen = () => {
   const { theme } = useTheme();
   const router = useRouter();
   const user = useStore((s) => s.user);
   const updateUser = useStore((s) => s.updateUser);

   const isDarkMode = theme === 'dark';
   const bgClass = isDarkMode ? 'bg-background-dark' : 'bg-gray-100';
   const textClass = isDarkMode ? 'text-text-primary' : 'text-gray-900';
   const cardBgClass = isDarkMode ? 'bg-card-dark' : 'bg-white';

   const [username, setUsername] = useState(user?.username || '');
   const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
   const [pickedImage, setPickedImage] = useState<string | null>(null);
   const [loading, setLoading] = useState(false);

   const dirty = pickedImage !== null || username !== (user?.username || '') || avatarUrl !== (user?.avatarUrl || '');

   const pickImage = async () => {
      try {
         const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
         if (status !== 'granted') {
            Alert.alert('Permission required', 'Allow photo library access to choose an avatar.');
            return;
         }
         const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
         });
         if (!result.canceled) {
            const uri = result.assets[0].uri;
            setPickedImage(uri);
            setAvatarUrl(uri); // for now treat same as avatarUrl until backend upload implemented
         }
      } catch (e: any) {
         Alert.alert('Image Picker Error', e.message || 'Could not pick image');
      }
   };

   const removeImage = async () => {
      try {
         setLoading(true);
         setPickedImage(null);
         setAvatarUrl('');
         const { success, data, message } = await profileService.updateUserProfile({ avatarUrl: null });
         if (success && data) {
            updateUser(data);
            Alert.alert('Removed', 'Avatar removed successfully.');
         } else {
            Alert.alert('Error', message || 'Failed to remove avatar');
         }
      } catch (e: any) {
         Alert.alert('Error', e.message || 'Unexpected error while removing avatar');
      } finally {
         setLoading(false);
      }
   };

   const onSave = async () => {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
         Alert.alert('Validation', 'Username is required');
         return;
      }
      try {
         setLoading(true);
         const payload = { username: trimmedUsername, avatarUrl: avatarUrl.trim() };
         const { success, data, message } = await profileService.updateUserProfile(payload);
         if (success && data) {
            updateUser(data);
            Alert.alert('Success', message || 'Profile updated');
            router.back();
         } else {
            Alert.alert('Error', message || 'Failed to update profile');
         }
      } catch (e: any) {
         Alert.alert('Error', e.message || 'Unexpected error');
      } finally {
         setLoading(false);
      }
   };

   return (
      <SafeAreaView className={`flex-1 ${bgClass}`}>
         <Animated.View entering={FadeInUp.duration(600)} className="flex-row items-center px-6 py-4">
            <Link href="/(tabs)/profile" asChild>
               <Pressable 
                  className="p-2 mr-4 rounded-full active:bg-gray-200 dark:active:bg-gray-800" 
                  disabled={loading}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
               >
                  <Ionicons name="arrow-back" size={26} color={isDarkMode ? 'white' : 'black'} />
               </Pressable>
            </Link>
            <Text className={`text-3xl font-bold ${textClass} tracking-tight`}>Edit Profile</Text>
         </Animated.View>

         <ScrollView className="flex-1 px-6" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeInDown.duration(600).delay(100)} className={`rounded-3xl p-6 mt-4 shadow-xl ${cardBgClass}`}>
               {/* Avatar Section */}
               <Text className={`text-lg font-semibold mb-4 ${textClass} tracking-tight`}>Avatar</Text>
               <View className="flex-row items-center mb-6">
                  {(pickedImage || avatarUrl) ? (
                     <Image
                        source={{ uri: pickedImage || avatarUrl }}
                        className="w-24 h-24 rounded-full mr-4 border-4 border-primary-green/30 shadow-lg"
                     />
                  ) : (
                     <View className="w-24 h-24 rounded-full mr-4 bg-gradient-to-br from-gray-400 to-gray-500 items-center justify-center shadow-lg">
                        <Ionicons name="person" size={40} color="#fff" />
                     </View>
                  )}
                  <View className="flex-1">
                     <Pressable
                        onPress={pickImage}
                        disabled={loading}
                        className="bg-primary-green py-3 px-5 rounded-2xl mb-2 shadow-md shadow-primary-green/20 active:scale-98"
                        style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                     >
                        <Text className="text-black text-center font-bold tracking-wide">Choose Photo</Text>
                     </Pressable>
                     {(pickedImage || avatarUrl) && (
                        <Pressable
                           onPress={removeImage}
                           disabled={loading}
                           className="bg-red-500 py-3 px-5 rounded-2xl shadow-md shadow-red-500/20 active:scale-98"
                           style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                        >
                           <Text className="text-white text-center font-bold tracking-wide">Remove</Text>
                        </Pressable>
                     )}
                  </View>
               </View>

               {/* Username Field */}
               <Text className={`text-lg font-semibold mb-3 ${textClass} tracking-tight`}>Username</Text>
               <CustomInput
                  iconName="account"
                  placeholder="Enter username"
                  autoCapitalize="none"
                  value={username}
                  onChangeText={setUsername}
                  editable={!loading}
               />

               {/* Avatar URL Field */}
               <Text className={`text-lg font-semibold mt-6 mb-3 ${textClass} tracking-tight`}>Avatar URL</Text>
               <CustomInput
                  iconName="image"
                  placeholder="https://..."
                  autoCapitalize="none"
                  value={avatarUrl}
                  onChangeText={setAvatarUrl}
                  editable={!loading}
               />

               {/* Save Changes Button */}
               <Pressable
                  onPress={onSave}
                  disabled={loading || !dirty}
                  className={`mt-8 py-4 rounded-2xl ${(loading || !dirty) ? 'opacity-50' : ''} bg-primary-green shadow-xl shadow-primary-green/30 active:scale-98`}
                  style={({ pressed }) => [{ opacity: pressed && !loading && dirty ? 0.9 : (loading || !dirty) ? 0.5 : 1, transform: [{ scale: pressed && !loading && dirty ? 0.98 : 1 }] }]}
               >
                  {loading ? (
                     <ActivityIndicator color="#000" />
                  ) : (
                     <Text className="text-black text-center text-lg font-bold tracking-wide">Save Changes</Text>
                  )}
               </Pressable>
            </Animated.View>
         </ScrollView>
      </SafeAreaView>
   );
};

export default EditProfileScreen;