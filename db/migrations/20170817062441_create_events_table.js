exports.up = function(knex, Promise) {
  knex.schema.dropTableIfExists('events');
  return Promise.all([
    knex.schema.createTable('events', function (table) {
      table.increments('id');
      table.string('name');
      table.string('description');
      table.string('location');
      table.string('short_url');
      table.integer('admin_id').unsigned().references('id').inTable('users');
    })
  ])
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('events');
};
