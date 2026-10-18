import {
  LegalDocument,
  LegalSection,
} from "@/components/legal/LegalDocument";

export const metadata = {
  title: "Terms of Service — Amana",
};

export default function TermsPage() {
  return (
    <LegalDocument title="Terms of Service">
      <LegalSection heading="1. About the pilot">
        <p>
          Amana is an agricultural escrow service that uses a Soroban smart
          contract on the Stellar network to hold funds until the parties to a
          trade confirm delivery or a mediator issues a ruling. During the
          pilot, the service is offered to a limited group of participants and
          may change or pause without notice.
        </p>
      </LegalSection>

      <LegalSection heading="2. Eligibility and accounts">
        <p>
          You must be at least 18 years old and able to enter binding contracts
          under Nigerian law. Your access is tied to a Stellar wallet that you
          control. You are responsible for keeping your wallet keys secure;
          Amana cannot recover lost keys or reverse transactions you signed.
        </p>
      </LegalSection>

      <LegalSection heading="3. Escrow and non-custody">
        <p>
          Amana does not take possession of goods and does not act as a bank.
          Funds locked in escrow can only move as the contract permits: by
          agreement of the buyer and seller, by a mediator ruling, or by the
          deadlines recorded in the contract. Network fees and the cNGN
          conversion rate are shown before you sign.
        </p>
      </LegalSection>

      <LegalSection heading="4. Evidence, delivery and disputes">
        <p>
          Parties may upload evidence, including video, delivery manifests and
          driver details. By uploading evidence you confirm that you have the
          right to share it and that it does not unlawfully depict or identify
          other people. Evidence may be reviewed by assigned mediators and
          retained as described in the Privacy Notice.
        </p>
        <p>
          Mediators decide disputes on the evidence submitted. Rulings are
          final for the purposes of the escrow contract, and loss allocation
          follows the terms shown when the trade is created.
        </p>
      </LegalSection>

      <LegalSection heading="5. Acceptable use">
        <p>
          You must not submit false evidence, impersonate another party,
          interfere with the service, or use Amana for money laundering,
          fraud or any other unlawful purpose. We may suspend access where we
          reasonably suspect any of these.
        </p>
      </LegalSection>

      <LegalSection heading="6. Disclaimers and liability">
        <p>
          The service is provided as is during the pilot. To the extent
          permitted by law, Amana is not liable for losses caused by blockchain
          network failures, third-party wallets, third-party logistics providers,
          or the actions of other users.
        </p>
      </LegalSection>

      <LegalSection heading="7. Governing law">
        <p>
          These terms are governed by the laws of the Federal Republic of
          Nigeria. [Dispute resolution forum and contact address to be
          confirmed by counsel.]
        </p>
      </LegalSection>

      <LegalSection heading="8. Contact">
        <p>[Legal entity name, registered address and support contact to be inserted.]</p>
      </LegalSection>
    </LegalDocument>
  );
}
