
const validator = new JustValidate('#loginForm');

validator
  .addField('#email', [
    {
      rule: 'required',
      errorMessage: 'vali Email is required',
    },
    {
      rule: 'email',
      errorMessage: 'vali Email is not valid',
    },
  ])
  .addField('#password', [
    {
      rule: 'required',
      errorMessage: 'vali Password is required',
    },
    {
      rule: 'minLength',
      value: 4,
      errorMessage: 'vali Password must be at least 8 characters long',
    },
  ])

