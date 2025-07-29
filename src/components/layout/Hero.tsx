import Link from 'next/link'

const Hero = () => {
  return (
    <section className="relative bg-gradient-to-br from-primary-50 to-secondary-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-bold text-secondary-900 leading-tight">
                Never Accidentally Spend
                <span className="text-primary-600 block">Your Tax Money Again</span>
              </h1>
              <p className="text-xl text-secondary-600 leading-relaxed">
                Automatically track tax collected from your Shopify and Square sales. 
                Know exactly how much money to set aside so it's there when you need to pay taxes.
              </p>
            </div>

            {/* Key Benefits */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-success-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-secondary-700 font-medium">Automatic tax tracking from your sales</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-success-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-secondary-700 font-medium">Know exactly how much to set aside</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-5 h-5 bg-success-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-secondary-700 font-medium">Simple monthly and weekly summaries</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/signup"
                className="btn-primary text-center px-8 py-3 text-lg"
              >
                Start Free Trial
              </Link>
              <Link
                href="/demo"
                className="btn-secondary text-center px-8 py-3 text-lg"
              >
                Watch Demo
              </Link>
            </div>

            {/* Social Proof */}
            <div className="pt-8">
              <p className="text-sm text-secondary-500 mb-4">Trusted by merchants worldwide</p>
              <div className="flex items-center space-x-8 opacity-60">
                <div className="text-2xl font-bold text-secondary-400">Shopify</div>
                <div className="text-2xl font-bold text-secondary-400">Square</div>
                <div className="text-sm text-secondary-400">+ More Integrations</div>
              </div>
            </div>
          </div>

          {/* Visual */}
          <div className="relative">
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 lg:p-8">
              {/* Mock Dashboard */}
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-secondary-900">Tax Tracker</h3>
                  <div className="w-3 h-3 bg-success-500 rounded-full"></div>
                </div>

                {/* Primary Set Aside Card */}
                <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-6 border-2 border-primary-200">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary-700">$4,892</div>
                    <div className="text-lg font-medium text-primary-600 mt-1">Tax Money to Set Aside</div>
                    <div className="text-sm text-primary-500 mt-2">From your recent sales</div>
                  </div>
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-secondary-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold text-secondary-700">$24,567</div>
                    <div className="text-xs text-secondary-600">Total Sales</div>
                  </div>
                  <div className="bg-secondary-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-semibold text-secondary-700">127</div>
                    <div className="text-xs text-secondary-600">Transactions</div>
                  </div>
                </div>

                {/* Recent Transactions */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-secondary-700">Recent Sales</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-secondary-600">Sale #1234</span>
                      <span className="font-medium text-secondary-700">+$24.80 tax</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-secondary-600">Sale #1233</span>
                      <span className="font-medium text-secondary-700">+$18.65 tax</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-secondary-600">Sale #1232</span>
                      <span className="font-medium text-secondary-700">+$31.20 tax</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-20 h-20 bg-primary-200 rounded-full opacity-20"></div>
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-success-200 rounded-full opacity-20"></div>
          </div>
        </div>
      </div>

      {/* Background Pattern */}
      <div className="absolute top-0 right-0 -z-10 opacity-10">
        <svg width="404" height="784" fill="none" viewBox="0 0 404 784">
          <defs>
            <pattern id="56409614-3d62-4985-9a10-7ca758a8f4f0" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="4" height="4" className="text-primary-500" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="404" height="784" fill="url(#56409614-3d62-4985-9a10-7ca758a8f4f0)" />
        </svg>
      </div>
    </section>
  )
}

export default Hero