import moment from "moment";
import ImapClient from "./imap-client"; // Use o caminho correto para o seu arquivo
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const client = new ImapClient({
    imap: {
      user: process.env.USER_MAIL as string,
      password: process.env.USER_PASSWORD as string,
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      authTimeout: 3000,
      tlsOptions: { rejectUnauthorized: false },
    },
  });

  try {
    await client.connect();
    const timeListMessage = moment();
    const messages = await client.lastHourMessages(1);
    // console.log(messages);
    await client.disconnect();
    const endTimeMessages = moment();
    const durationListMessage = moment.duration(
      endTimeMessages.diff(timeListMessage)
    );
    const secondsMessages = durationListMessage.asSeconds();
    console.log(
      `Tempo gasto por mensagens ${
        messages.length
      } foi ${secondsMessages.toFixed(2)} segundos.`
    );

    await client.connect();
    const timeMessage = moment();
    const uid = "30850";
    await client.saveAttachmentsMessage(uid, "anexos");

    const endTimeMessage = moment();
    const durationMessage = moment.duration(endTimeMessage.diff(timeMessage));
    const secondsMessage = durationMessage.asSeconds();
    console.log(
      `Tempo gasto por mensagem UID ${uid} foi ${secondsMessage.toFixed(
        2
      )} segundos.`
    );
    await client.disconnect();
  } catch (error) {
    console.error(error);
  } finally {
    await client.disconnect();
  }
}

main();
