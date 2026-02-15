package service

import (
	"fmt"
	"net/smtp"
)

type smtpEmailSender struct {
	host string
	port int
	user string
	pass string
	from string
}

func NewSMTPEmailSender(host string, port int, user, pass, from string) EmailSender {
	return &smtpEmailSender{
		host: host,
		port: port,
		user: user,
		pass: pass,
		from: from,
	}
}

func (s *smtpEmailSender) Send(to, subject, body string) error {
	addr := fmt.Sprintf("%s:%d", s.host, s.port)
	msg := []byte(fmt.Sprintf("To: %s\r\nSubject: %s\r\n\r\n%s\r\n", to, subject, body))

	var auth smtp.Auth
	if s.user != "" {
		auth = smtp.PlainAuth("", s.user, s.pass, s.host)
	}

	return smtp.SendMail(addr, auth, s.from, []string{to}, msg)
}
