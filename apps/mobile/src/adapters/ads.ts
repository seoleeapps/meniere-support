import mobileAds, {
  AdsConsent,
  MaxAdContentRating,
} from "react-native-google-mobile-ads";
import type { AdsPort } from "@meniere/product-core";
let initialized = false;
export const ads: AdsPort = {
  async prepare() {
    try {
      await AdsConsent.gatherConsent();
    } catch {
      /* Previous valid consent may still allow requests. */
    }
    const info = await AdsConsent.getConsentInfo();
    if (!info.canRequestAds) return false;
    if (!initialized) {
      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.G,
      });
      await mobileAds().initialize();
      initialized = true;
    }
    return true;
  },
  async privacyOptions() {
    await AdsConsent.showPrivacyOptionsForm();
  },
};
