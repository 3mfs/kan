import { generateAvatarUrl } from "@kan/shared/utils";

export const createAvatarUrlResolver = () => {
  const urlsByImageKey = new Map<string, Promise<string | null>>();

  return (imageKey: string | null | undefined) => {
    if (!imageKey) return Promise.resolve(null);

    const cachedUrl = urlsByImageKey.get(imageKey);

    if (cachedUrl) return cachedUrl;

    const url = generateAvatarUrl(imageKey);
    urlsByImageKey.set(imageKey, url);

    return url;
  };
};
