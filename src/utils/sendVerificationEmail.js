const transporter = require("../config/emailConfig");

const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${process.env.BACKEND_URL}/api/auth/verify-email/${token}`;

  await transporter.sendMail({
    from: `"Role Auth" <${process.env.SMTP_FROM}>`,
    to: email,
    subject: "Verify your email address",
    text: `Please verify your email address by visiting: ${verificationUrl}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verify Your Email</title>
      </head>

      <body style="
        margin: 0;
        padding: 0;
        background-color: #f4f7fb;
        font-family: Arial, Helvetica, sans-serif;
        color: #1f2937;
      ">

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="background-color: #f4f7fb; padding: 40px 20px;"
        >
          <tr>
            <td align="center">

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="
                  max-width: 560px;
                  background-color: #ffffff;
                  border-radius: 14px;
                  overflow: hidden;
                  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
                "
              >

                <tr>
                  <td style="
                    background-color: #111827;
                    padding: 28px 30px;
                    text-align: center;
                  ">
                    <h1 style="
                      margin: 0;
                      color: #ffffff;
                      font-size: 26px;
                      font-weight: 700;
                    ">
                      Role Auth
                    </h1>

                    <p style="
                      margin: 8px 0 0;
                      color: #d1d5db;
                      font-size: 14px;
                    ">
                      Secure account management
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 40px 35px;">

                    <div style="
                      width: 64px;
                      height: 64px;
                      margin: 0 auto 24px;
                      background-color: #ecfdf5;
                      border-radius: 50%;
                      text-align: center;
                      line-height: 64px;
                      font-size: 30px;
                    ">
                      ✓
                    </div>

                    <h2 style="
                      margin: 0 0 14px;
                      text-align: center;
                      color: #111827;
                      font-size: 24px;
                    ">
                      Verify your email
                    </h2>

                    <p style="
                      margin: 0 0 18px;
                      text-align: center;
                      color: #4b5563;
                      font-size: 15px;
                      line-height: 1.7;
                    ">
                      Thanks for creating your account.
                      Please verify your email address to activate your
                      account and continue using Role Auth.
                    </p>

                    <table
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                    >
                      <tr>
                        <td align="center" style="padding: 12px 0 28px;">

                          <a
                            href="${verificationUrl}"
                            target="_blank"
                            style="
                              display: inline-block;
                              padding: 14px 30px;
                              background-color: #111827;
                              color: #ffffff;
                              text-decoration: none;
                              border-radius: 8px;
                              font-size: 15px;
                              font-weight: 600;
                            "
                          >
                            Verify My Email
                          </a>

                        </td>
                      </tr>
                    </table>

                    <div style="
                      background-color: #f9fafb;
                      border: 1px solid #e5e7eb;
                      border-radius: 8px;
                      padding: 16px;
                    ">

                      <p style="
                        margin: 0 0 8px;
                        color: #6b7280;
                        font-size: 12px;
                        font-weight: 600;
                      ">
                        Verification link
                      </p>

                      <p style="
                        margin: 0;
                        color: #6b7280;
                        font-size: 12px;
                        line-height: 1.6;
                        word-break: break-all;
                      ">
                        ${verificationUrl}
                      </p>

                    </div>

                    <p style="
                      margin: 24px 0 0;
                      color: #6b7280;
                      font-size: 13px;
                      line-height: 1.6;
                      text-align: center;
                    ">
                      This verification link will expire in
                      <strong>15 minutes</strong>.
                    </p>

                    <p style="
                      margin: 12px 0 0;
                      color: #9ca3af;
                      font-size: 12px;
                      line-height: 1.6;
                      text-align: center;
                    ">
                      If you didn't create this account, you can safely
                      ignore this email.
                    </p>

                  </td>
                </tr>

                <tr>
                  <td style="
                    background-color: #f9fafb;
                    border-top: 1px solid #e5e7eb;
                    padding: 20px 30px;
                    text-align: center;
                  ">

                    <p style="
                      margin: 0;
                      color: #9ca3af;
                      font-size: 12px;
                    ">
                      © ${new Date().getFullYear()} Role Auth. All rights reserved.
                    </p>

                  </td>
                </tr>

              </table>

            </td>
          </tr>
        </table>

      </body>
      </html>
    `,
  });
};

module.exports = sendVerificationEmail;
