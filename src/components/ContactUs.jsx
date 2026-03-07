import { useApp } from '../context/AppContext';

export default function ContactUs() {
  const { form, handleFormChange, handleFormSubmit } = useApp();

  return (
    <>
      <div className="contact-hero">
        <h1>Contact Us</h1>
        <p>We'd love to hear from you. Reach out and we'll respond within 24 hours.</p>
      </div>

      <div className="contact-body">
        <div className="contact-info-card">
          <h3>Get in Touch</h3>
          <div className="contact-info-item">
            <span className="contact-info-icon">✉️</span>
            <div>
              <strong>Email</strong>
              <a href="mailto:info@gardenroots.com.sg">help@gardenroots.com</a>
            </div>
          </div>
          <div className="contact-info-item">
            <span className="contact-info-icon">📞</span>
            <div>
              <strong>Phone</strong>
              <a href="tel:+6591555947">+65 9155 5947</a>
            </div>
          </div>
          <div className="contact-info-item">
            <span className="contact-info-icon">💬</span>
            <div>
              <strong>WhatsApp</strong>
              <a href="https://wa.me/6591555947" target="_blank" rel="noreferrer">+65 9155 5947</a>
            </div>
          </div>
          <div className="contact-info-item">
            <span className="contact-info-icon">🕐</span>
            <div>
              <strong>Business Hours</strong>
              <span>Mon–Sat: 9am–6pm SGT</span>
            </div>
          </div>
          <div className="contact-info-item">
            <span className="contact-info-icon">📸</span>
            <div>
              <strong>Instagram</strong>
              <a href="https://instagram.com" target="_blank" rel="noreferrer">@gardenroots.sg</a>
            </div>
          </div>

          <a className="contact-wa-btn" href="https://wa.me/6591555947?text=Hi Garden Roots! I'd like to enquire about your mangoes." target="_blank" rel="noreferrer">
            💬 Chat on WhatsApp
          </a>
        </div>

        <div className="contact-form-card">
          <h3>Send Us a Message</h3>
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input name="firstName" value={form.firstName} onChange={handleFormChange} placeholder="Jane" />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input name="lastName" value={form.lastName} onChange={handleFormChange} placeholder="Tan" />
            </div>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input name="email" type="email" value={form.email} onChange={handleFormChange} placeholder="jane@email.com" />
          </div>
          <div className="form-group">
            <label>Mobile Number</label>
            <input name="phone" value={form.phone} onChange={handleFormChange} placeholder="+65 9000 0000" />
          </div>
          <div className="form-group">
            <label>Subject</label>
            <input name="subject" value={form.subject} onChange={handleFormChange} placeholder="Order enquiry, delivery, etc." />
          </div>
          <div className="form-group">
            <label>Message</label>
            <textarea name="message" value={form.message} onChange={handleFormChange} placeholder="How can we help you?" />
          </div>
          <button className="btn-submit" onClick={handleFormSubmit}>Send Message</button>
        </div>
      </div>
    </>
  );
}
