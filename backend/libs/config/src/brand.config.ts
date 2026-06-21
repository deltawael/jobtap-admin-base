export const brandConfig = {
  name: 'JobTap',
  apiDocs: {
    title: 'JobTap Backend API',
    description:
      'This API powers the JobTap admin platform and keeps customer-facing branding aligned across runtime services.',
    termsOfService: 'JobTap Terms of Service',
    contact: {
      name: 'JobTap',
      url: '',
      email: ''
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/license/mit'
    }
  },
  seedUsers: {
    super: {
      username: 'JobTap',
      nickName: 'JobTap'
    }
  }
} as const;