const map1 = new Map();

map1.set('a', 1);
map1.set('b', 2);
map1.set('c', 3);

console.log(map1.keys());
map1.forEach(connection => {
    console.log(connection);
})