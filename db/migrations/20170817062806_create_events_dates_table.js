exports.up = function(knex, Promise) {
  knex.schema.dropTableIfExists('events_dates');
  return Promise.all([
    knex.schema.createTable('events_dates', function (table) {
      table.increments('id');
      table.dateTime('datetime');
      table.integer('event_id').unsigned().references('id').inTable('events');

    })
  ])
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('events_dates');
};
