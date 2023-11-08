import imaps, { ImapSimple, ImapSimpleOptions, Message } from "imap-simple";
import { writeFile } from "fs/promises";
import path from "path";
import moment from "moment";

class ImapClient {
  private connection: ImapSimple | null = null;

  constructor(private config: ImapSimpleOptions) {}

  async connect(): Promise<void> {
    this.connection = await imaps.connect(this.config);
  }

  async allMessages(): Promise<Message[]> {
    if (!this.connection) {
      throw new Error("Não conectado ao servidor IMAP.");
    }

    await this.connection.openBox("INBOX");
    const searchCriteria = ["ALL"];
    const fetchOptions = {
      bodies: ["HEADER", "TEXT"],
      markSeen: false,
    };

    const messages = await this.connection.search(searchCriteria, fetchOptions);
    return messages;
  }

  async lastHourMessages(hours: number): Promise<Message[]> {
    const dataFilter = moment().subtract(hours, "hours").format("YYYY-MM-DD");

    if (!this.connection) {
      throw new Error("Não conectado ao servidor IMAP.");
    }

    await this.connection.openBox("INBOX");

    var searchCriteria = [["X-GM-RAW", `has:attachment after:${dataFilter}`]];

    const fetchOptions = {
      bodies: ["HEADER", "TEXT"],
      markSeen: false,
    };

    const messages = await this.connection.search(searchCriteria, fetchOptions);
    return messages;
  }

  async saveAttachmentsMessage(
    uid: string,
    attachmentPath: string
  ): Promise<void> {
    if (!this.connection) {
      throw new Error("Não conectado ao servidor IMAP.");
    }

    await this.connection.openBox("INBOX");

    let searchCriteria = [["UID", uid]];
    let fetchOptions = {
      bodies: ["HEADER", "TEXT"],
      markSeen: false,
      struct: true,
    };

    const messages = await this.connection.search(searchCriteria, fetchOptions);

    for (const message of messages) {
      const messageData: imaps.Message = message;
      const attributes = messageData.attributes;
      const struct = attributes.struct;

      if (struct != undefined) {
        const parts = imaps.getParts(struct);
        for (const part of parts) {
          if (
            part.disposition &&
            part.disposition.type.toUpperCase() === "ATTACHMENT"
          ) {
            const sizeInBytes = part.size;

            let sizeInKB = (sizeInBytes / 1024).toFixed(2);

            const filename = part?.params?.name;
            const encoding = part?.encoding;

            console.log(`File: ${filename} Size: ${sizeInKB} KB`);

            const attachment = await this.connection.getPartData(message, part);
            const filePath = path.join(attachmentPath, filename);
            await writeFile(filePath, attachment);
          }
        }
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
    }
  }
}

export default ImapClient;
