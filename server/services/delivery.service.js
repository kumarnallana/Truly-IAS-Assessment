export async function sendEmailOtp({ email, otp }) {
  console.log("\n[SIMULATED EMAIL]");
  console.log(`To: ${email}`);
  console.log(`OTP: ${otp}\n`);
}

export async function sendSmsOtp({ phone, otp }) {
  console.log("\n[SIMULATED SMS]");
  console.log(`To: ${phone}`);
  console.log(`OTP: ${otp}\n`);
}
