import { ArchiveIcon, CalendarIcon, ShieldIcon } from './Icons'

const methods = [
  {
    title: 'Official source',
    text: 'We link only to official pages and documentation.',
    Icon: ShieldIcon,
  },
  {
    title: 'Checked daily',
    text: 'Source evidence is rechecked by an automated workflow.',
    Icon: CalendarIcon,
  },
  {
    title: 'Expired offers archived',
    text: 'Outdated offers are retained for transparency, not deleted.',
    Icon: ArchiveIcon,
  },
]

export function MethodBand() {
  return (
    <section className="method-band" id="how-it-works" aria-labelledby="method-heading">
      <h2 id="method-heading">Every listing earns its place.</h2>
      <div className="method-items">
        {methods.map(({ title, text, Icon }) => (
          <article key={title}>
            <Icon />
            <div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
