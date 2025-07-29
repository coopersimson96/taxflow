const Features = () => {
  const features = [
    {
      title: 'Automatic Tax Tracking',
      description: 'Connect your Shopify or Square store and we automatically track every dollar of tax you collect from sales.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: 'Set-Aside Alerts',
      description: 'Get email notifications telling you exactly how much money to set aside so you never accidentally spend your tax dollars.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h10a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      title: 'Simple Summaries',
      description: 'Get clear weekly and monthly summaries showing total tax collected and how much to keep separate from your operating funds.',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ]

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-secondary-900">
            Simple Tax Tracking That Actually Works
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto">
            Three core features that help small business owners manage their tax money without the complexity
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group bg-white border border-secondary-200 rounded-xl p-8 hover:shadow-lg hover:border-primary-200 transition-all duration-300"
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-lg flex items-center justify-center group-hover:bg-primary-600 group-hover:text-white transition-all duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-secondary-900">
                  {feature.title}
                </h3>
              </div>
              <p className="text-secondary-600 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Integration Showcase */}
        <div className="mt-20 bg-gradient-to-r from-primary-50 to-secondary-50 rounded-2xl p-8 lg:p-12">
          <div className="text-center space-y-6">
            <h3 className="text-2xl lg:text-3xl font-bold text-secondary-900">
              Works with Your Existing Store
            </h3>
            <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
              Connect your Shopify or Square account in minutes. We automatically start tracking your tax collection from all sales.
            </p>
            
            {/* Platform Logos */}
            <div className="flex items-center justify-center space-x-12 pt-8">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white rounded-xl shadow-md flex items-center justify-center">
                  <div className="text-2xl font-bold text-green-600">S</div>
                </div>
                <div className="text-xl font-semibold text-secondary-800">Shopify</div>
              </div>
              
              <div className="text-secondary-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
              
              <div className="w-12 h-12 bg-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">T</span>
              </div>
              
              <div className="text-secondary-400">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-white rounded-xl shadow-md flex items-center justify-center">
                  <div className="w-8 h-8 bg-blue-600 rounded"></div>
                </div>
                <div className="text-xl font-semibold text-secondary-800">Square</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Features