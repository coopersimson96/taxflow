import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - Set Aside Tax Analytics',
  description: 'Terms of service for Set Aside Tax Analytics Shopify app',
}

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <p className="text-sm text-gray-600 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
      
      <div className="prose prose-gray max-w-none space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">1. Acceptance of Terms</h2>
          <p>
            By installing and using Set Aside ("the app"), you agree to these Terms of Service. 
            If you do not agree, please do not use the app.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">2. Service Description</h2>
          <p className="mb-4">Set Aside provides:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Tax analytics and reporting for Shopify stores</li>
            <li>Daily payout breakdowns with tax calculations</li>
            <li>Historical tax data analysis</li>
            <li>Tax obligation tracking and estimates</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">3. Your Responsibilities</h2>
          <p className="mb-4">You agree to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide accurate store information</li>
            <li>Use the app in compliance with applicable laws</li>
            <li>Not attempt to reverse engineer or hack the app</li>
            <li>Verify tax calculations with your accountant</li>
            <li>Report bugs or issues promptly</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">4. Limitations & Disclaimers</h2>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 font-semibold">
              ⚠️ IMPORTANT: This app provides estimates and analytics. Always consult with a tax professional 
              for official tax advice and compliance.
            </p>
          </div>
          <ul className="list-disc pl-6 space-y-2">
            <li>Tax calculations are estimates based on available data</li>
            <li>We are not responsible for tax compliance or filing</li>
            <li>Service availability is subject to maintenance and updates</li>
            <li>Data accuracy depends on Shopify data integrity</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">5. Data Usage</h2>
          <p className="mb-4">By using this app, you authorize us to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Access your Shopify order and product data</li>
            <li>Calculate tax analytics from this data</li>
            <li>Store processed data securely for reporting</li>
            <li>Provide insights and recommendations based on your data</li>
          </ul>
          <p className="mt-4">
            See our{' '}
            <a href="https://taxflow-smoky.vercel.app/privacy" className="text-blue-600 hover:text-blue-800">
              Privacy Policy
            </a>{' '}
            for detailed information about data handling.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">6. Subscription & Billing</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Free plan includes basic tax tracking</li>
            <li>Premium features may require subscription</li>
            <li>Billing handled securely through Shopify</li>
            <li>Cancel anytime through your Shopify admin</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">7. App Removal</h2>
          <p className="mb-4">When you uninstall the app:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>API access is immediately revoked</li>
            <li>Data is retained for 30 days for recovery</li>
            <li>All data is permanently deleted after grace period</li>
            <li>You can request immediate deletion by contacting support</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Set Aside shall not be liable for any indirect, 
            incidental, special, consequential, or punitive damages, including lost profits, 
            arising from your use of the app.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">9. Changes to Terms</h2>
          <p>
            We may modify these terms at any time. Changes will be effective immediately upon posting. 
            Continued use of the app constitutes acceptance of modified terms.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">10. Support</h2>
          <p>For questions about these terms or the app:</p>
          <ul className="list-disc pl-6 space-y-2 mt-4">
            <li>
              Email:{' '}
              <a href="mailto:support@taxflow-smoky.vercel.app" className="text-blue-600 hover:text-blue-800">
                support@taxflow-smoky.vercel.app
              </a>
            </li>
            <li>
              App URL:{' '}
              <a href="https://taxflow-smoky.vercel.app" className="text-blue-600 hover:text-blue-800" target="_blank" rel="noopener noreferrer">
                https://taxflow-smoky.vercel.app
              </a>
            </li>
            <li>Response time: Within 24 hours</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mt-6 mb-4">11. Governing Law</h2>
          <p>
            These terms are governed by the laws of your jurisdiction. Any disputes will be 
            resolved through binding arbitration.
          </p>
        </section>
      </div>

      <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
        <p>© {new Date().getFullYear()} Set Aside. All rights reserved.</p>
      </div>
    </div>
  )
}