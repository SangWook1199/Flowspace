import { Component } from "react";

// 화면을 그리다가 예외가 나면 흰 화면 대신 안내를 보여줘요.
// resetKey가 바뀌면(예: 다른 주소로 이동) 오류 상태를 풀고 다시 그려요.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("화면을 그리다 오류가 났어요", error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div role="alert" style={{ margin: "auto", padding: 40, textAlign: "center" }}>
        <p>화면을 불러오다 문제가 생겼어요.</p>
        <p style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>
          잠시 뒤 다시 시도하거나, 계속 같으면 새로고침해 주세요.
        </p>
        <div style={{ marginTop: 14, display: "flex", gap: 8, justifyContent: "center" }}>
          <button type="button" onClick={() => this.setState({ error: null })}>
            다시 시도
          </button>
          <button type="button" onClick={() => window.location.reload()}>
            새로고침
          </button>
        </div>
      </div>
    );
  }
}
