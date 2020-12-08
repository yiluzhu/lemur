import logging

handler = logging.FileHandler('extra_log.log')
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
extra_logger = logging.getLogger(__name__)
extra_logger.setLevel(logging.INFO)
extra_logger.addHandler(handler)
