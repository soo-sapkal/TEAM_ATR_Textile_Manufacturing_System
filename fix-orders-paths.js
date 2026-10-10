
const fs = require("fs");
let content = fs.readFileSync("components/pages/OrdersPages.tsx", "utf8");

content = content.replace(/href="\/orders\/new"/g, "href={`${user?.role === \"BUYER\" ? \"/buyer\" : user?.role === \"OWNER\" ? \"/owner\" : \"\"}/orders/new`}");
content = content.replace(/href="\/orders"/g, "href={`${user?.role === \"BUYER\" ? \"/buyer\" : user?.role === \"OWNER\" ? \"/owner\" : \"\"}/orders`}");
content = content.replace(/href={`\/orders\/\${order.id}`}/g, "href={`${user?.role === \"BUYER\" ? \"/buyer\" : user?.role === \"OWNER\" ? \"/owner\" : \"\"}/orders/${order.id}`}");

fs.writeFileSync("components/pages/OrdersPages.tsx", content);

