export default function RetroSummaryCard({ item }) {
  const Icon = item.icon;

  return (
    <article className="summary-card">
      <div className={`summary-icon ${item.color}`}>
        <Icon size={22} />
      </div>

      <div className="summary-content">
        <span>{item.title}</span>

        <h2>
          {item.value}
          <small>{item.unit}</small>
        </h2>

        {item.desc && <p>{item.desc}</p>}
      </div>
    </article>
  );
}
