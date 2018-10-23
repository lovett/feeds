module.exports = function (record, specs) {
    let formattedRecord = record;
    specs.forEach((spec) => {
        if (spec.type === 'timestamp') {
            formattedRecord[spec.name] = new Date(record[spec.name] * 1000).toLocaleString();
        }
    });

    return formattedRecord;
};
