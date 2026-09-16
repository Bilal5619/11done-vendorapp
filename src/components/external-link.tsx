import { Href, Link } from "expo-router";
import {
  openBrowserAsync,
  WebBrowserPresentationStyle,
} from "expo-web-browser";
import { type ComponentProps } from "react";

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  href: Href & string;
};

function isSafeExternalUrl(url: string) {
  try {
    const parsedUrl = new URL(url);

    return parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export function ExternalLink({ href, ...rest }: Props) {
  return (
    <Link
      target="_blank"
      {...rest}
      href={href}
      onPress={async (event) => {
        if (!isSafeExternalUrl(href)) {
          event.preventDefault();
          return;
        }

        if (process.env.EXPO_OS !== "web") {
          event.preventDefault();

          await openBrowserAsync(href, {
            presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
          });
        }
      }}
    />
  );
}
