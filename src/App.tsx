
// App.tsx
export { default } from "expo-router/entry";



// import { NavigationContainer } from "@react-navigation/native";
// import React from "react";
// import { SafeAreaProvider } from "react-native-safe-area-context";

// import { RootNavigator } from "@/src/navigation/RootNavigator";
// import { QueryProvider } from "@/src/providers/QueryProvider";

// import { useThemeSyncFromAppSettings } from "@/src/hooks/useThemeSyncFromAppSettings";
// import { ThemeProvider } from "@/src/theme/ThemeProvider";

// /**
//  * Runs global side-effects that require providers above it.
//  * - Must be inside ThemeProvider because it uses useTheme()
//  */
// function AppBootSync() {
//     useThemeSyncFromAppSettings();
//     return null;
// }

// export default function App() {
//     return (
//         <SafeAreaProvider>
//             <QueryProvider>
//                 <ThemeProvider>
//                     <AppBootSync />
//                     <NavigationContainer>
//                         <RootNavigator />
//                     </NavigationContainer>
//                 </ThemeProvider>
//             </QueryProvider>
//         </SafeAreaProvider>
//     );
// }