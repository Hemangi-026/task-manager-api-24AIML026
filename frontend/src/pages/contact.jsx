import { useState } from 'react';

const OWNER_EMAIL = 'hemangiparmar1117@gmail.com';

function Contact() {
  const [form, setForm]       = useState({ name: '', email: '', message: '' });
  const [showTip, setShowTip] = useState(false);
  const [sent, setSent]       = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = `Task Manager message from ${form.name || 'a visitor'}`;
    const body    = `${form.message}\n\nReply to: ${form.email}`;
    const url     = `https://mail.google.com/mail/?view=cm&fs=1&to=${OWNER_EMAIL}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setSent(true);
    setForm({ name: '', email: '', message: '' });
  };

  return (
    <section className="contact-page">
      <div className="page-heading">
        <h1>✉️ Contact</h1>
        <p className="subtitle">Get in touch — messages open in Gmail.</p>
      </div>

      {sent && (
        <div className="contact-success">
          ✅ Gmail opened! If it didn't,{' '}
          <button className="link-btn" onClick={() => setSent(false)}>
            send another message
          </button>.
        </div>
      )}

      <form className="contact-form" onSubmit={handleSubmit}>
        <div className="contact-field">
          <label htmlFor="c-name">Your name</label>
          <input
            id="c-name"
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Hemangi Parmar"
            required
          />
        </div>

        <div className="contact-field">
          <label htmlFor="c-email">Your email</label>
          <input
            id="c-email"
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="contact-field">
          <div className="message-label-row">
            <label htmlFor="c-message">Message</label>
            <button
              type="button"
              className="tip-toggle"
              onClick={() => setShowTip((p) => !p)}
            >
              {showTip ? 'Hide tip' : '💡 Tip'}
            </button>
          </div>
          {showTip && (
            <p className="contact-tip">
              Mention what you'd like to collaborate on, a question about the project, or just say hi!
            </p>
          )}
          <textarea
            id="c-message"
            name="message"
            rows={5}
            value={form.message}
            onChange={handleChange}
            placeholder="Hello! I wanted to ask about…"
            required
          />
          <p className="char-count">{form.message.length} / 1000 characters</p>
        </div>

        <button type="submit" className="btn">
          📨 Send Message
        </button>
      </form>
    </section>
  );
}

export default Contact;
