import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - Set Aside Tax Analytics',
  description: 'Privacy policy for Set Aside Tax Analytics Shopify app',
}

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-sm text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="prose prose-gray max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">1. Information We Collect</h2>
          <p className="mb-4">
            Set Aside ("we", "our", or "the app") collects the following information to provide tax analytics services:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Shop Information:</strong> Store name, domain, and Shopify plan</li>
            <li><strong>Order Data:</strong> Order amounts, dates, tax collected, and order numbers</li>
            <li><strong>Product Information:</strong> Product names and tax settings</li>
            <li><strong>Customer Data:</strong> We do NOT store customer personal information. Order data is anonymized.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">2. How We Use Your Information</h2>
          <p className="mb-4">We use the collected information solely to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Calculate tax obligations from your sales</li>
            <li>Generate tax reports and analytics</li>
            <li>Display daily payout breakdowns</li>
            <li>Track tax trends over time</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">3. Data Storage & Security</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>All data is encrypted in transit using HTTPS</li>
            <li>Data is stored securely in SOC 2 compliant databases</li>
            <li>We use industry-standard security measures</li>
            <li>Access to data is strictly limited and logged</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">4. Data Sharing</h2>
          <p className="mb-4">We do NOT:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Sell your data to third parties</li>
            <li>Share your data with other merchants</li>
            <li>Use your data for advertising</li>
            <li>Transfer data outside your organization</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">5. GDPR Compliance</h2>
          <p className="mb-4">We comply with GDPR requirements:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Right to Access:</strong> Request a copy of your data anytime</li>
            <li><strong>Right to Deletion:</strong> Request deletion of your data</li>
            <li><strong>Right to Portability:</strong> Export your data in standard formats</li>
            <li><strong>Data Minimization:</strong> We only collect necessary data</li>
          </ul>
          <p className="mt-4">
            To exercise these rights, contact us at privacy@setaside.app
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">6. Data Retention</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Active data: Retained while your subscription is active</li>
            <li>After uninstall: Data deleted after 30-day grace period</li>
            <li>Backups: Deleted within 90 days</li>
            <li>Logs: Retained for 1 year for security purposes</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">7. Third-Party Services</h2>
          <p className="mb-4">We use these third-party services:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Shopify:</strong> For app installation and API access</li>
            <li><strong>Supabase:</strong> For secure database hosting</li>
            <li><strong>Vercel:</strong> For app hosting and analytics</li>
          </ul>
          <p className="mt-4">
            Each service has its own privacy policy and security measures.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">8. Updates to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any changes by 
            updating the "Last updated" date at the top of this policy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">9. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us:</p>
          <ul className="list-disc pl-6 space-y-2 mt-4">
            <li>Email: privacy@setaside.app</li>
            <li>Support: support@setaside.app</li>
          </ul>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
        <p>© {new Date().getFullYear()} Set Aside. All rights reserved.</p>
      </div>
    </div>
  )
}