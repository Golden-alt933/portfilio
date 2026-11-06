import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Mail } from "lucide-react";
import { contactAccessKey, contactEndpoint, contactTopics, profile } from "./content";
import { RiseBlock, RiseText } from "./RiseText";
import "./project-page.css";
import "./contact-page.css";

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactPage() {
  const [topic, setTopic] = useState(contactTopics[0]);
  const [status, setStatus] = useState<Status>("idle");
  const [sentName, setSentName] = useState("");

  useEffect(() => {
    document.title = `Contact — ${profile.name} Portfolio`;
    return () => {
      document.title = "R — Frame & Function";
    };
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (status === "sending") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    // Bots fill every field; people never see this one.
    if (String(data.get("_honey") ?? "")) {
      setSentName(name);
      setStatus("sent");
      return;
    }
    if (!contactAccessKey) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    try {
      const response = await fetch(contactEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: contactAccessKey,
          subject: `New enquiry from ${name} via portfolio`,
          from_name: "R Studio portfolio",
          name,
          email,
          replyto: email,
          topic,
          message,
        }),
      });
      const result = (await response.json().catch(() => null)) as { success?: boolean } | null;
      if (response.ok && result?.success === true) {
        setSentName(name);
        setStatus("sent");
        form.reset();
        setTopic(contactTopics[0]);
      } else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  const mailto = `mailto:${profile.contactEmail}`;

  return (
    <main className="project-page case contact section-pad">
      <RiseBlock className="case-top">
        <Link to="/" className="case-back">
          <ArrowLeft size={15} /> Home
        </Link>
        <span className="case-kicker">Contact / Collaborate</span>
      </RiseBlock>

      <div className="contact-grid">
        <header className="contact-intro">
          <RiseText as="h1" className="case-title contact-title" text="Let's make the next frame." stagger={0.08} delay={0.1} />
          <RiseText
            className="case-tagline"
            text="Tell me about the story you want cut or the idea you want built. I'm open to freelance projects and full-time roles."
            delay={0.35}
            stagger={0.018}
          />
          <RiseBlock className="contact-direct" delay={0.6}>
            <span className="case-kicker">Prefer email?</span>
            <a href={mailto} className="contact-direct-link">
              <Mail size={17} /> {profile.contactEmail}
              <ArrowUpRight size={15} />
            </a>
          </RiseBlock>
        </header>

        <RiseBlock className="contact-panel" delay={0.45}>
          {status === "sent" ? (
            <div className="contact-done" role="status" aria-live="polite">
              <span className="contact-done-icon" aria-hidden="true">
                <Check size={22} />
              </span>
              <h2>Thanks{sentName ? `, ${sentName.split(" ")[0]}` : ""}.</h2>
              <p>Your message is on its way. I'll get back to you within a couple of days.</p>
              <div className="case-ctas">
                <button type="button" className="case-cta" onClick={() => setStatus("idle")}>
                  Send another message
                </button>
                <Link className="case-cta" to="/works">
                  See the work
                </Link>
              </div>
            </div>
          ) : (
            <form className="contact-form" onSubmit={submit}>
              <div className="contact-field">
                <label htmlFor="contact-name">Name</label>
                <input
                  id="contact-name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={120}
                  placeholder="Your name"
                />
              </div>
              <div className="contact-field">
                <label htmlFor="contact-email">Email</label>
                <input
                  id="contact-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  required
                  maxLength={200}
                  placeholder="you@example.com"
                />
              </div>
              <fieldset className="contact-field contact-topics">
                <legend>What's it about?</legend>
                <div className="contact-pills">
                  {contactTopics.map((item) => (
                    <label key={item} className="contact-pill" data-active={item === topic}>
                      <input
                        type="radio"
                        name="topic"
                        value={item}
                        checked={item === topic}
                        onChange={() => setTopic(item)}
                      />
                      {item}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="contact-field">
                <label htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  name="message"
                  required
                  rows={6}
                  maxLength={5000}
                  placeholder="What are you making, and when do you need it?"
                />
              </div>
              {/* Honeypot: hidden from people and screen readers, filled by bots. */}
              <div className="contact-honey" aria-hidden="true">
                <label htmlFor="contact-honey">Leave this empty</label>
                <input id="contact-honey" name="_honey" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              <div className="contact-submit">
                <button type="submit" className="case-cta solid" disabled={status === "sending"}>
                  {status === "sending" ? "Sending…" : "Send message"}
                  {status !== "sending" && <ArrowRight size={14} />}
                </button>
                <p className="contact-status" role="status" aria-live="polite">
                  {status === "sending" && "Sending your message…"}
                  {status === "error" && (
                    <>
                      That didn't go through. Please try again, or email me at{" "}
                      <a href={mailto}>{profile.contactEmail}</a>.
                    </>
                  )}
                </p>
              </div>
            </form>
          )}
        </RiseBlock>
      </div>
    </main>
  );
}
