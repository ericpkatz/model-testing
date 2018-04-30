const Sequelize = require('sequelize');
const conn = new Sequelize(process.env.DATABASE_URL, { logging: false });
const AWS = require('aws-sdk');
const env = process.env.ENV;
if(env === 'TEST'){
  AWS.config.loadFromPath('./test.config.json');
}

const Image = conn.define('image', {
  uris: {
    type: Sequelize.JSONB,
    defaultValue: {}
  },
},{
  hooks: {
    beforeCreate: function(image){
      return Promise.all(
        Object.keys(image.uris).reduce( (memo, key) => {
          memo.push(image.saveToCloud(key));
          return memo;
        }, [])
      )
      .then( uploads => {
        image.uris = uploads.reduce((memo, result)=> {
          memo[result.key] = result.uri;
          return memo;
        }, {});
      });
    }
  }
});

//resolves with object - key and url
Image.prototype.saveToCloud = function(key){
  return new Promise((resolve, reject)=> {
    const S3 = new AWS.S3();
    S3.createBucket({ Bucket: process.env.BUCKET}, (err, bucket)=>{
      if(err){
        return reject(err);
      }
      S3.upload({
        Bucket: process.env.BUCKET,
        Key: key,
        Body: this.uris[key],
        ACL: 'public-read',
      }, (err, data)=>{
        if(err){
          return reject(err);
        }
        resolve({uri: data.Location, key });
      });
    });
  });

}

const sync = ()=> conn.sync({ force: true });

module.exports = {
  sync,
  models: {
    Image
  }
};
