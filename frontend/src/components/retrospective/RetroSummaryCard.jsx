// 스프린트 목록의 요약 카드(.sprintSummary)와 같은 모양이에요: 색 점 + 이름 + 큰 숫자.
// 보조 설명(desc)은 카드가 작아서 마우스를 올리면 툴팁으로 보여줘요.
export default function RetroSummaryCard({ item }) {
  return (
    <article className="retro-stat" title={item.desc || undefined}>
      <span className={item.color} />
      <p>{item.title}</p>
      <strong>
        {item.value}
        <small>{item.unit}</small>
      </strong>
    </article>
  );
}
