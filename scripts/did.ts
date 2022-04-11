const axios = require('axios')

axios.post('http://host.docker.internal:9000' + '/register',
  {role: 'ENDORSER', alias: null, verkey: 'H3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV', did: 'WgWxqztrNooG92RXvxSTWv'})
  .then((x: any) => console.log(x))
  .catch((x: any) => console.error(x))
