const fs = require('fs');

const path = 'App.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Import useColorScheme
if (!content.includes('useColorScheme')) {
  content = content.replace(
    /import \{ StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, StatusBar, ActivityIndicator, Dimensions, Modal, Animated, Vibration \} from 'react-native';/,
    "import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, StatusBar, ActivityIndicator, Dimensions, Modal, Animated, Vibration, useColorScheme } from 'react-native';"
  );
}

// 2. Add isDark to App component
if (!content.includes('const isDark = colorScheme === \'dark\';')) {
  content = content.replace(
    /export default function App\(\) \{/,
    `export default function App() {\n  const colorScheme = useColorScheme();\n  const isDark = colorScheme === 'dark';\n  const styles = useMemo(() => getStyles(isDark), [isDark]);`
  );
}

// 3. Update Chart Config
content = content.replace(
  /const chartConfig = \{([\s\S]*?)\};/,
  `const chartConfig = {
    backgroundColor: isDark ? '#1e1e1e' : '#ffffff',
    backgroundGradientFrom: isDark ? '#1e1e1e' : '#ffffff',
    backgroundGradientTo: isDark ? '#1e1e1e' : '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => \`rgba(255, 0, 0, \${opacity})\`,
    labelColor: (opacity = 1) => isDark ? \`rgba(255, 255, 255, \${opacity})\` : \`rgba(100, 100, 100, \${opacity})\`,
    style: { borderRadius: 16 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: "#ff0000" },
    barPercentage: 0.6
  };`
);

// 4. Update LimelightNav props
content = content.replace(
  /<LimelightNav activeTab=\{activeTab\} onTabChange=\{setActiveTab\} \/>/g,
  `<LimelightNav activeTab={activeTab} onTabChange={setActiveTab} isDark={isDark} />`
);

// 5. Change styles to getStyles
content = content.replace(
  /const styles = StyleSheet\.create\(\{/g,
  `const getStyles = (isDark) => StyleSheet.create({`
);

// 6. Replace colors inside getStyles
// We need to carefully replace colors but only inside the getStyles block.
// Let's do it globally because the only place these colors are used statically is there.

// bg
content = content.replace(/backgroundColor: '#f5f7fa'/g, "backgroundColor: isDark ? '#121212' : '#f5f7fa'");
content = content.replace(/backgroundColor: '#F8F9FB'/g, "backgroundColor: isDark ? '#121212' : '#F8F9FB'");
content = content.replace(/backgroundColor: '#fff'/g, "backgroundColor: isDark ? '#1e1e1e' : '#fff'");
content = content.replace(/backgroundColor: '#F9FAFB'/g, "backgroundColor: isDark ? '#2a2a2a' : '#F9FAFB'");
content = content.replace(/backgroundColor: '#f8f9fa'/g, "backgroundColor: isDark ? '#1a1a1a' : '#f8f9fa'");

// color texts
content = content.replace(/color: '#333'/g, "color: isDark ? '#fff' : '#333'");
content = content.replace(/color: '#444'/g, "color: isDark ? '#e0e0e0' : '#444'");
content = content.replace(/color: '#1A1A1A'/g, "color: isDark ? '#fff' : '#1A1A1A'");
content = content.replace(/color: '#111827'/g, "color: isDark ? '#fff' : '#111827'");
content = content.replace(/color: '#374151'/g, "color: isDark ? '#e5e7eb' : '#374151'");
content = content.replace(/color: '#666'/g, "color: isDark ? '#aaa' : '#666'");
content = content.replace(/color: '#6B7280'/g, "color: isDark ? '#9ca3af' : '#6B7280'");
content = content.replace(/color: '#999'/g, "color: isDark ? '#888' : '#999'");
content = content.replace(/color: '#9CA3AF'/g, "color: isDark ? '#6b7280' : '#9CA3AF'");

// border colors
content = content.replace(/borderColor: '#eee'/g, "borderColor: isDark ? '#333' : '#eee'");
content = content.replace(/borderBottomColor: '#f0f0f0'/g, "borderBottomColor: isDark ? '#333' : '#f0f0f0'");
content = content.replace(/borderTopColor: '#f0f0f0'/g, "borderTopColor: isDark ? '#333' : '#f0f0f0'");
content = content.replace(/borderBottomColor: '#eee'/g, "borderBottomColor: isDark ? '#333' : '#eee'");
content = content.replace(/borderBottomColor: '#f9f9f9'/g, "borderBottomColor: isDark ? '#222' : '#f9f9f9'");
content = content.replace(/borderColor: '#E5E7EB'/g, "borderColor: isDark ? '#374151' : '#E5E7EB'");
content = content.replace(/borderTopColor: '#F3F4F6'/g, "borderTopColor: isDark ? '#374151' : '#F3F4F6'");
content = content.replace(/borderColor: 'rgba\\(0,0,0,0\.02\\)'/g, "borderColor: isDark ? '#333' : 'rgba(0,0,0,0.02)'");
content = content.replace(/borderBottomColor: 'rgba\\(0,0,0,0\.05\\)'/g, "borderBottomColor: isDark ? '#333' : 'rgba(0,0,0,0.05)'");

// Inline modal close button icon
content = content.replace(/name="close-circle" size=\{32\} color="#000"/g, "name=\"close-circle\" size={32} color={isDark ? '#fff' : '#000'}");
content = content.replace(/name="close-circle" size=\{20\} color="#999"/g, "name=\"close-circle\" size={20} color={isDark ? '#888' : '#999'}");

fs.writeFileSync(path, content, 'utf8');
console.log('App.js updated');
