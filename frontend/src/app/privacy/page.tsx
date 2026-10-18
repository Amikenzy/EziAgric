import {
  LegalDocument,
  LegalSection,
} from "@/components/legal/LegalDocument";

export const metadata = {
  title: "Privacy Notice — Amana",
};

export default function PrivacyPage() {
  return (
    <LegalDocument title="Privacy Notice">
      <LegalSection heading="1. Who we are">
        <p>
          This notice explains how Amana collects and uses personal data under
          the Nigeria Data Protection Regulation (NDPR) 2019. The data
          controller is [legal entity name to be inserted]. Our Data Protection
          Officer can be reached at [DPO contact email to be inserted].
        </p>
      </LegalSection>

      <LegalSection heading="2. Data we collect">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Wallet addresses:</strong> your Stellar public key, which
            identifies you on the platform and on the public ledger.
          </li>
          <li>
            <strong>Phone numbers:</strong> contact numbers for you or your
            counterparties and for drivers named on delivery manifests.
          </li>
          <li>
            <strong>Driver and vehicle details:</strong> driver name, ID
            number, vehicle registration and route description.
          </li>
          <li>
            <strong>Evidence videos and photos:</strong> recordings of goods,
            loading, delivery or handover, which may show people, faces,
            vehicles or locations.
          </li>
          <li>
            <strong>Location checkpoints:</strong> GPS points recorded along a
            shipment where these are submitted.
          </li>
          <li>
            <strong>Technical data:</strong> device and usage data collected by
            our analytics and error reporting.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Why we use it and our legal basis">
        <p>
          We use this data to create and settle escrow trades, verify delivery,
          run mediated disputes, prevent fraud and meet legal obligations. Our
          bases are your consent (given when you connect a wallet and accept
          these notices), performance of the trade contract, and legitimate
          interests in dispute resolution and fraud prevention. You may
          withdraw consent at any time, but this does not affect processing
          already carried out.
        </p>
      </LegalSection>

      <LegalSection heading="4. Evidence videos and phone numbers">
        <p>
          Driver details are stored encrypted at rest. [Engineering to confirm
          encryption status of phone numbers before publication.] Phone numbers
          and driver details are shown only to parties to the trade and to
          assigned mediators. Evidence videos are uploaded to a
          third-party IPFS pinning service and are referenced on the Stellar
          network by content hash. Content pinned to IPFS and hashes recorded
          on a public ledger are difficult or impossible to delete. Please do
          not upload footage of people who have not agreed to appear in it.
        </p>
      </LegalSection>

      <LegalSection heading="5. Who we share data with">
        <ul className="list-disc pl-5 space-y-1">
          <li>The other parties to your trade, to the extent needed to complete it.</li>
          <li>Mediators assigned to a dispute.</li>
          <li>Infrastructure providers, including hosting, database, IPFS pinning and analytics processors, under written data processing terms.</li>
          <li>Regulators or law enforcement where required by law.</li>
        </ul>
        <p>
          We do not sell personal data. Public blockchain data cannot be
          withdrawn from the public network.
        </p>
      </LegalSection>

      <LegalSection heading="6. Retention">
        <p>
          We keep trade and dispute records for [retention period to be
          confirmed by counsel] after a trade closes, so that disputes and legal
          claims can be handled. Phone numbers and driver details are kept no
          longer than necessary for that purpose. [Deletion schedule for
          videos and IPFS-pinned content to be confirmed.]
        </p>
      </LegalSection>

      <LegalSection heading="7. Your rights">
        <p>
          Under the NDPR you may request access to, correction of, or deletion
          of your personal data, object to or restrict processing, and request a
          copy of your data. Where deletion is not possible because of the
          public ledger or IPFS, we will tell you why. Send requests to the
          contact in section 1. You may also complain to the National Information
          Technology Development Agency (NITDA).
        </p>
      </LegalSection>

      <LegalSection heading="8. Security">
        <p>
          We use encryption in transit and at rest for sensitive fields, access
          controls for mediator and admin views, and audit logging. No system is
          completely secure, and we will notify affected users and the
          regulator of breaches as the NDPR requires.
        </p>
      </LegalSection>

      <LegalSection heading="9. Changes">
        <p>
          We will publish changes to this notice and, where they are material,
          ask you to accept the updated version before continuing.
        </p>
      </LegalSection>
    </LegalDocument>
  );
}
