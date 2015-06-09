module.exports = {
    construct: function (type, samples, alpha)  {
                   var coef = [];
                   switch (type)
                   {
                       case 'ham': 
                           for (var i = 0; i < samples; i++) {
                               coef[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i)/(samples - 1));
                           }
                       break;
                       case 'tukey':
                           var sm1 = samples - 1,
                               asm1 = alpha * sm1;
                           for (var i = 0; i < samples; i++) {
                               // Left tail
                               if (i < asm1 / 2)
                                  coef[i] = 0.5 * (1 + Math.cos(Math.PI * ((2 * samples)/(asm1) - 1))); 
                               // Right tail
                               else if (i > (sm1 * (1 - alpha / 2)))
                                  coef[i] = 0.5 * (1 + Math.cos(Math.PI * ((2 * samples)/(asm1) - (2 / alpha) + 1)));
                               // Middle (rectangular)
                               else coef[i] = 1;
                           }
                       break;
                       case 'flat':
                           for (var i = 0; i < samples; i++)
                               coef[i] = 1.0;
                       break;
                   }
                   return coef;
               }
};
