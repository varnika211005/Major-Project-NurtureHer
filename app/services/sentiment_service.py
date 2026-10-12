from app.ml.sentiment import analyze_sentiment


class SentimentService:
    def analyze(self, text: str | None) -> str:
        return analyze_sentiment(text)

