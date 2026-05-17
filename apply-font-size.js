const fs = require('fs');
const path = 'App.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state for font size
if (!content.includes('const [fontSizeMult, setFontSizeMult] = useState(1);')) {
  content = content.replace(
    /const \[isDark, setIsDark\] = useState\(systemColorScheme === 'dark'\);/,
    `const [isDark, setIsDark] = useState(systemColorScheme === 'dark');\n  const [fontSizeMult, setFontSizeMult] = useState(1);`
  );
}

// 2. Load font preference
if (!content.includes('savedFont')) {
  content = content.replace(
    /if \(savedTheme !== null\) \{\s*setIsDark\(savedTheme === 'dark'\);\s*\}/,
    `if (savedTheme !== null) {\n          setIsDark(savedTheme === 'dark');\n        }\n        const savedFont = await AsyncStorage.getItem('@font_preference');\n        if (savedFont !== null) {\n          setFontSizeMult(parseFloat(savedFont));\n        }`
  );
}

// 3. Add font change handler
if (!content.includes('handleFontSizeChange')) {
  content = content.replace(
    /const toggleTheme = async \(\) => \{/,
    `const handleFontSizeChange = async (multiplier) => {\n    setFontSizeMult(multiplier);\n    try {\n      await AsyncStorage.setItem('@font_preference', multiplier.toString());\n    } catch (error) {\n      console.error('Error saving font:', error);\n    }\n  };\n\n  const toggleTheme = async () => {`
  );
}

// 4. Update styles useMemo
content = content.replace(
  /const styles = useMemo\(\(\) => getStyles\(isDark\), \[isDark\]\);/,
  `const styles = useMemo(() => getStyles(isDark, fontSizeMult), [isDark, fontSizeMult]);`
);

// 5. Update getStyles signature
content = content.replace(
  /const getStyles = \(isDark\) => StyleSheet\.create\(\{/,
  `const getStyles = (isDark, fontMult = 1) => StyleSheet.create({`
);

// 6. Update all fontSize: X to fontSize: X * fontMult inside getStyles
// We only want to replace inside getStyles. Let's find the start of getStyles
const parts = content.split('const getStyles = (isDark, fontMult = 1) => StyleSheet.create({');
if (parts.length === 2) {
  let stylesStr = parts[1];
  // Replace `fontSize: 16` with `fontSize: 16 * fontMult`
  // But avoid replacing if it's already `fontSize: 16 * fontMult`
  stylesStr = stylesStr.replace(/fontSize:\s*(\d+)(?!\s*\*\s*fontMult)/g, 'fontSize: Math.round($1 * fontMult)');
  content = parts[0] + 'const getStyles = (isDark, fontMult = 1) => StyleSheet.create({' + stylesStr;
}

fs.writeFileSync(path, content, 'utf8');
console.log('App.js updated for font size');
