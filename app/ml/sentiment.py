NEGATIVE_WORDS = {"sad", "hopeless", "anxious", "worthless", "cry", "tired", "alone", "angry", "panic"}
POSITIVE_WORDS = {"happy", "calm", "supported", "hopeful", "good", "better", "loved", "safe"}


def analyze_sentiment(text: str | None) -> str:
    if not text:
        return "neutral"
    words = {word.strip(".,!?;:").lower() for word in text.split()}
    negative = len(words & NEGATIVE_WORDS)
    positive = len(words & POSITIVE_WORDS)
    if negative > positive:
        return "negative"
    if positive > negative:
        return "positive"
    return "neutral"

