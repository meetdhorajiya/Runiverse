import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Video, ResizeMode } from 'expo-av'; // Import ResizeMode
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons'; // Using an icon for the button

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Background Video */}
      <Video
        source={require('../assets/videos/welcome.mp4')}
        style={styles.video}
        isMuted // Muted by default for backgrounds
        shouldPlay
        isLooping
        resizeMode={ResizeMode.COVER} // Use ResizeMode enum for best practice
      />

      {/* Overlay Content */}
      <View style={styles.overlay}>
        {/* Top Spacer - pushes content down */}
        <View style={{ flex: 1 }} />

        {/* Main Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>Run. Conquer. Own Your World.</Text>
          <Text style={styles.subtitle}>
            Transform every step into progress. Capture territory, climb leaderboards and grow stronger with the community that runs the Runiverse.
          </Text>
          <Text style={styles.featuresText}>
            SEAMLESS TRACKING • TERRITORY STRATEGY • SOCIAL MOTIVATION
          </Text>
        </View>

        {/* Bottom Navigation */}
        <View style={styles.bottomContainer}>
          <View style={styles.dotsContainer}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.replace('/(tabs)')} 
          >
            <Feather name="arrow-right" size={28} color="black" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    ...StyleSheet.absoluteFillObject, // Makes video fill the entire screen
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Dark overlay for text readability
    justifyContent: 'space-between', // Pushes content to top and bottom
    padding: 30,
  },
  textContainer: {
    flex: 3, // Takes up more space
    justifyContent: 'center', // Centers the text block vertically
  },
  title: {
    fontSize: 48,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 24,
    marginBottom: 20,
  },
  featuresText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    letterSpacing: 1.5,
  },
  bottomContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20, // Add some padding at the very bottom
  },
  dotsContainer: {
    flexDirection: 'row',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#90EE90', // A light green color
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
});