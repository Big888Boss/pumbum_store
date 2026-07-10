import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <section className="hero">
      <div className="container">
        <div className="eyebrow">404</div>
        <h1>Страница не найдена</h1>
        <p className="lead">Такой страницы нет в каталоге. Вернитесь к разделам или свяжитесь с магазином.</p>
        <div className="actions">
          <Link className="btn btn-primary" href="/catalog">Открыть каталог</Link>
          <Link className="btn btn-secondary" href="/contacts">Связаться</Link>
        </div>
      </div>
    </section>
  );
}
