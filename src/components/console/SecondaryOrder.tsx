interface SecondaryOrderProps {
  titleId: string;
  kicker: string;
  title: string;
  body: string;
  managerNote: string;
}

/** A secondary-order callout — the annex elevator or the streetlight order.
 * Both are structurally identical panels, differing only in their copy. */
export default function SecondaryOrder({ titleId, kicker, title, body, managerNote }: SecondaryOrderProps) {
  return (
    <aside className="secondary-order" aria-labelledby={titleId}>
      <div>
        <div className="secondary-order-kicker">{kicker}</div>
        <div className="secondary-order-title" id={titleId}>
          {title}
        </div>
        <p>{body}</p>
        <p className="manager-aside">M. // &quot;{managerNote}&quot;</p>
      </div>
      <a className="btn btn-primary btn-compact" href="#investigations">
        ▸ INVESTIGATE
      </a>
    </aside>
  );
}
