import React from 'react';
import { View, StyleSheet } from 'react-native';
import ProjectForm from './ProjectForm';

export default function MainScreen() {
  return (
    <View style={styles.container}>
      <ProjectForm />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f4f7',
  },
});
