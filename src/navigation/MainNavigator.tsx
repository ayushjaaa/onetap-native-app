import React from 'react';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '@/screens/home/HomeScreen';
import { ProfileScreen } from '@/screens/profile/ProfileScreen';
import { MyAdsScreen } from '@/screens/profile/MyAdsScreen';
import { SearchScreen } from '@/screens/search/SearchScreen';
import {
  CategoryBrowseScreen,
  CategoryItemsScreen,
  CategoryListScreen,
  ListingDetailScreen,
  PostAdPlaceholder,
} from '@/screens/marketplace';
import { ComingSoonScreen } from '@/screens/coming-soon/ComingSoonScreen';
import { BecomeSellerIntroScreen } from '@/screens/seller/BecomeSellerIntroScreen';
import { AadhaarNumberScreen } from '@/screens/seller/AadhaarNumberScreen';
import { AadhaarOtpScreen } from '@/screens/seller/AadhaarOtpScreen';
import { SellerTypeScreen } from '@/screens/seller/SellerTypeScreen';
import { IndividualOnboardingScreen } from '@/screens/seller/IndividualOnboardingScreen';
import { PackageSelectionScreen } from '@/screens/seller/PackageSelectionScreen';
import { PaymentResultScreen } from '@/screens/seller/PaymentResultScreen';
import { ProductWalletScreen } from '@/screens/seller/ProductWalletScreen';
import { ListAProductScreen } from '@/screens/seller/ListAProductScreen';
import { ChatConversationScreen } from '@/screens/chat/ChatConversationScreen';
import { ChatListScreen } from '@/screens/chat/ChatListScreen';
import { BuyerPurchaseHistoryScreen } from '@/screens/buyer/BuyerPurchaseHistoryScreen';
import { SellerSalesHistoryScreen } from '@/screens/seller/SellerSalesHistoryScreen';
import { NotificationCenterScreen } from '@/screens/notifications/NotificationCenterScreen';
import { NotificationDetailScreen } from '@/screens/notifications/NotificationDetailScreen';
import { ForgotPasswordPhoneScreen } from '@/screens/auth/ForgotPasswordPhoneScreen';
import { ForgotPasswordOtpScreen } from '@/screens/auth/ForgotPasswordOtpScreen';
import { ForgotPasswordResetScreen } from '@/screens/auth/ForgotPasswordResetScreen';
import { BottomNavBar, type NavTabKey } from '@/components/marketplace';
import { useAppSelector } from '@/hooks/useAppSelector';
import { resolvePostAdDestination } from '@/navigation/postAdRouter';
import type {
  MainStackParamList,
  MainTabParamList,
} from '@/types/navigation.types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

const TAB_TO_KEY: Record<keyof MainTabParamList, NavTabKey> = {
  Home: 'home',
  Search: 'search',
  Post: 'post',
  MyAds: 'myAds',
  Profile: 'profile',
};

const KEY_TO_TAB: Record<NavTabKey, keyof MainTabParamList> = {
  home: 'Home',
  search: 'Search',
  post: 'Post',
  myAds: 'MyAds',
  profile: 'Profile',
};

const CustomTabBar: React.FC<BottomTabBarProps> = ({ state, navigation }) => {
  const currentRoute = state.routes[state.index].name as keyof MainTabParamList;
  const currentKey = TAB_TO_KEY[currentRoute];
  const user = useAppSelector(s => s.auth.user);

  const handleChange = (key: NavTabKey) => {
    // Post is not a real destination tab. Tapping it should push the right
    // seller-flow screen on top of the *current* tab so back returns the user
    // to whichever tab they were on (Home / Search / MyAds / Profile).
    if (key === 'post') {
      const destination = resolvePostAdDestination(user);
      navigation.getParent()?.navigate(destination as never);
      return;
    }
    const route = KEY_TO_TAB[key];
    navigation.navigate(route);
  };

  return <BottomNavBar current={currentKey} onChange={handleChange} />;
};

const TabsNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={props => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Post" component={PostAdPlaceholder} />
      <Tab.Screen name="MyAds" component={MyAdsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const MainNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Tabs" component={TabsNavigator} />
      <Stack.Screen name="CategoryList" component={CategoryListScreen} />
      <Stack.Screen name="CategoryBrowse" component={CategoryBrowseScreen} />
      <Stack.Screen name="CategoryItems" component={CategoryItemsScreen} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} />
      <Stack.Screen name="ComingSoon" component={ComingSoonScreen} />
      <Stack.Screen
        name="BecomeSellerIntro"
        component={BecomeSellerIntroScreen}
      />
      <Stack.Screen name="AadhaarNumber" component={AadhaarNumberScreen} />
      <Stack.Screen name="AadhaarOtp" component={AadhaarOtpScreen} />
      <Stack.Screen name="SellerType" component={SellerTypeScreen} />
      <Stack.Screen
        name="IndividualOnboarding"
        component={IndividualOnboardingScreen}
      />
      <Stack.Screen
        name="PackageSelection"
        component={PackageSelectionScreen}
      />
      <Stack.Screen name="PaymentResult" component={PaymentResultScreen} />
      <Stack.Screen name="ProductWallet" component={ProductWalletScreen} />
      <Stack.Screen name="ListProduct" component={ListAProductScreen} />
      <Stack.Screen
        name="ChatConversation"
        component={ChatConversationScreen}
      />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen
        name="PurchaseHistory"
        component={BuyerPurchaseHistoryScreen}
      />
      <Stack.Screen name="SalesHistory" component={SellerSalesHistoryScreen} />
      <Stack.Screen name="Notifications" component={NotificationCenterScreen} />
      <Stack.Screen
        name="NotificationDetail"
        component={NotificationDetailScreen}
      />
      <Stack.Screen
        name="ForgotPasswordPhone"
        component={ForgotPasswordPhoneScreen}
      />
      <Stack.Screen
        name="ForgotPasswordOtp"
        component={ForgotPasswordOtpScreen}
      />
      <Stack.Screen
        name="ForgotPasswordReset"
        component={ForgotPasswordResetScreen}
      />
    </Stack.Navigator>
  );
};
