var imaps = require("imap-simple");
const path = require("path");
const fs = require("fs");
const moment = require("moment");
require("dotenv").config();

const config = {
  imap: {
    user: process.env.USER_MAIL,
    password: process.env.USER_PASSWORD,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
    authTimeout: 3000,
    tlsOptions: { rejectUnauthorized: false },
  },
};

const dataFilter = moment().subtract(1, "hours").format("YYYY-MM-DD");
const now = moment().format("H:m:s");
const startTimeAll = moment();

imaps
  .connect(config)
  .then((connection) => {
    console.log("start", now);

    return connection
      .openBox("INBOX")
      .then(async () => {
        var searchCriteria = [
          ["X-GM-RAW", `has:attachment after:${dataFilter}`],
        ];

        const fetchOptions = {
          bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)", "TEXT"],
          markSeen: false,
          struct: true,
        };

        await fetchAttachments(connection, searchCriteria, fetchOptions).catch(
          console.error
        );

        const endTimeAll = moment();
        const durationAll = moment.duration(endTimeAll.diff(startTimeAll));
        const secondsSpentAll = durationAll.asSeconds();
        console.log(
          `Tempo gasto total: ${secondsSpentAll.toFixed(2)} segundos.`
        );
        console.log("Finish", now);
      })
      .catch((err) => {
        console.error(err);
        connection.end();
      });
  })
  .catch((err) => {
    console.error(err);
    connection.end();
  });

const startTimeMensagem = moment();

//BUSCAR POR ID
imaps
  .connect(config)
  .then(function (connection) {
    connection.openBox("INBOX").then(function () {
      let emailId = "31027";
      let searchCriteria = [["UID", emailId]];
      let fetchOptions = {
        bodies: ["HEADER", "TEXT"],
        markSeen: false,
        struct: true,
      };

      connection.search(searchCriteria, fetchOptions).then(function (results) {
        let message = results[0];

        const parts = imaps.getParts(message.attributes.struct);
        const attributes = message.attributes;

        downloadParts(connection, message, parts);

        connection.end();

        const endTimeMensagem = moment();
        const durationMessage = moment.duration(
          endTimeMensagem.diff(startTimeMensagem)
        );
        const secondsMessage = durationMessage.asSeconds();
        console.log(
          `Tempo gasto por mensagem: UID ${emailId} foi ${secondsMessage.toFixed(
            2
          )} segundos.`
        );
        console.log("Finish", now);
      });
    });
  })
  .catch(function (err) {
    console.log(err);
    connection.end();
  });

async function fetchAttachments(connection, searchCriteria, fetchOptions) {
  try {
    const startTime = moment();
    const messages = await connection.search(searchCriteria, fetchOptions);
    const endTime = moment();
    const duration = moment.duration(endTime.diff(startTime));
    const secondsSpent = duration.asSeconds();

    console.log(`Número de mensagens nas últimas 1 hora: ${messages.length}`);
    console.log(
      `Tempo gasto para buscar mensagens: ${secondsSpent.toFixed(2)} segundos.`
    );

    for (let message of messages) {
      const parts = imaps.getParts(message.attributes.struct);
      const attributes = message.attributes;

      await downloadParts(parts);
    }
  } catch (err) {
    console.error(err);
  } finally {
    connection.end();
  }
}

async function downloadParts(connection, message, parts) {
  for await (let part of parts) {
    if (
      part.disposition &&
      part.disposition.type.toUpperCase() === "ATTACHMENT"
    ) {
      const sizeInBytes = part.size;

      let sizeInKB = (sizeInBytes / 1024).toFixed(2);

      const filename = part?.params?.name;
      const encoding = part?.encoding;

      console.log(`File: ${filename} Encode ${encoding} Size: ${sizeInKB} KB`);

      if (
        filename &&
        encoding === "BASE64" &&
        [".pdf", ".xml"].some((ext) => filename.toLowerCase().endsWith(ext))
      ) {
        const attachment = await connection.getPartData(message, part);
        console.log(attachment);
        const savePath = path.join(__dirname, "anexos", filename);
        await fs.promises.writeFile(savePath, attachment);
      }
    }
  }
}
