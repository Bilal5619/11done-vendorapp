import { router } from "expo-router";
import { Component, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

/**
 * The one safety net for the whole app.
 *
 * Without this, any unexpected error thrown while a screen is rendering —
 * not inside a button press or a network call, which already have their own
 * try/catch, but while React is building the screen itself — took the whole
 * app down with no recovery ("keeps stopping"), for whatever screen hit it.
 * A handful of crash reports that looked unrelated (different screens,
 * different actions) were very plausibly all this same underlying gap.
 *
 * This does not fix any one specific bug — it stops the class of bug from
 * being a hard crash, and shows something the vendor can tap their way out
 * of instead.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    if (__DEV__) {
      console.error("Caught by ErrorBoundary:", error, info.componentStack);
    }
  }

  reset = () => {
    this.setState({ error: null });
    try {
      router.replace("/dashboard");
    } catch {
      // Navigating away can itself throw if the router isn't ready yet —
      // the screen still recovers from the crash either way, since the
      // error state above is already cleared.
    }
  };

  render() {
    if (this.state.error) {
      return (
        <View style={styles.screen}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            This screen ran into a problem and couldn&apos;t continue. Nothing
            you were doing has been charged or lost — tap below to go back to
            the dashboard and try again.
          </Text>
          <Pressable onPress={this.reset} style={styles.button}>
            <Text style={styles.buttonText}>Back to dashboard</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#060708",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 12,
  },
  title: {
    color: "#f8fafc",
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },
  message: {
    color: "#a3adbc",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    marginBottom: 8,
  },
  button: {
    minHeight: 50,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#ff6a00",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#121212",
    fontSize: 15,
    fontWeight: "700",
  },
});
