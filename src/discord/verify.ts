import nacl from "tweetnacl";

export function verifyDiscordSignature(
  body: string,
  signature: string,
  timestamp: string,
  publicKey: string
): boolean {
  try {
    if (!signature || !timestamp || !publicKey) {
      return false;
    }
    const signatureBuffer = Buffer.from(signature, "hex");
    const publicKeyBuffer = Buffer.from(publicKey, "hex");
    const messageBuffer = Buffer.from(timestamp + body);

    return nacl.sign.detached.verify(
      messageBuffer,
      signatureBuffer,
      publicKeyBuffer
    );
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}
